import { db } from './index.ts';
import {
  elections,
  electionContests,
  electionCandidates,
  electionVoterRoll,
  electionBallots,
  electionResultsCertifications,
  identities,
  profiles,
  classSets,
  tenants,
  associations,
} from './schema.ts';
import { eq, and, desc, asc, ilike, sql, inArray } from 'drizzle-orm';
import { recordAuditEvent } from './authServices.ts';
import crypto from 'crypto';

export interface ElectionQueryOptions {
  tenantId?: string;
  associationId?: string;
  classSetId?: string;
  status?: string;
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * 1. GET ELECTIONS
 * Returns list of elections with counts for electors, ballots, contests, and certification status.
 */
export async function getElections(options: ElectionQueryOptions) {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const conditions = [];
  if (options.tenantId) {
    conditions.push(eq(elections.tenantId, options.tenantId));
  }
  if (options.associationId) {
    conditions.push(eq(elections.associationId, options.associationId));
  }
  if (options.classSetId) {
    conditions.push(eq(elections.classSetId, options.classSetId));
  }
  if (options.status) {
    conditions.push(eq(elections.status, options.status));
  }
  if (options.type) {
    conditions.push(eq(elections.type, options.type));
  }
  if (options.search) {
    conditions.push(ilike(elections.title, `%${options.search}%`));
  }

  const query = db
    .select({
      id: elections.id,
      tenantId: elections.tenantId,
      associationId: elections.associationId,
      classSetId: elections.classSetId,
      title: elections.title,
      description: elections.description,
      type: elections.type,
      scope: elections.scope,
      status: elections.status,
      secretBallot: elections.secretBallot,
      quorumPercentage: elections.quorumPercentage,
      requiresFinancialGoodStanding: elections.requiresFinancialGoodStanding,
      requiresVerifiedStatus: elections.requiresVerifiedStatus,
      startTime: elections.startTime,
      endTime: elections.endTime,
      certifiedAt: elections.certifiedAt,
      certifiedByIdentityId: elections.certifiedByIdentityId,
      certificationNotes: elections.certificationNotes,
      certificationSealHash: elections.certificationSealHash,
      createdAt: elections.createdAt,
      classSetDisplayName: classSets.displayName,
    })
    .from(elections)
    .leftJoin(classSets, eq(elections.classSetId, classSets.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(elections.startTime))
    .limit(limit)
    .offset(offset);

  const results = await query;

  // Enrich with aggregated stats
  const enriched = await Promise.all(
    results.map(async (elc) => {
      // Elector roll stats
      const [voterStats] = await db
        .select({
          totalEligible: sql<number>`count(*)::int`,
          votedCount: sql<number>`count(case when has_voted = true then 1 end)::int`,
        })
        .from(electionVoterRoll)
        .where(eq(electionVoterRoll.electionId, elc.id));

      const totalEligible = voterStats?.totalEligible || 0;
      const votedCount = voterStats?.votedCount || 0;
      const turnoutRate = totalEligible > 0 ? Math.round((votedCount / totalEligible) * 1000) / 10 : 0;
      const quorumMet = turnoutRate >= elc.quorumPercentage;

      // Contests count
      const [contestStats] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(electionContests)
        .where(eq(electionContests.electionId, elc.id));

      return {
        ...elc,
        totalEligibleVoters: totalEligible,
        ballotsCastCount: votedCount,
        turnoutPercentage: `${turnoutRate}%`,
        quorumMet,
        contestCount: contestStats?.count || 0,
        isCertified: elc.status === 'CERTIFIED',
      };
    })
  );

  return enriched;
}

/**
 * 2. GET ELECTION DETAIL
 * Full breakdown of an election including contests, vetted candidates, voter roll status, and certification.
 */
export async function getElectionDetail(electionId: string, currentIdentityId?: string) {
  const [elc] = await db
    .select({
      id: elections.id,
      tenantId: elections.tenantId,
      associationId: elections.associationId,
      classSetId: elections.classSetId,
      title: elections.title,
      description: elections.description,
      type: elections.type,
      scope: elections.scope,
      status: elections.status,
      secretBallot: elections.secretBallot,
      quorumPercentage: elections.quorumPercentage,
      requiresFinancialGoodStanding: elections.requiresFinancialGoodStanding,
      requiresVerifiedStatus: elections.requiresVerifiedStatus,
      startTime: elections.startTime,
      endTime: elections.endTime,
      certifiedAt: elections.certifiedAt,
      certifiedByIdentityId: elections.certifiedByIdentityId,
      certificationNotes: elections.certificationNotes,
      certificationSealHash: elections.certificationSealHash,
      createdAt: elections.createdAt,
      classSetDisplayName: classSets.displayName,
    })
    .from(elections)
    .leftJoin(classSets, eq(elections.classSetId, classSets.id))
    .where(eq(elections.id, electionId));

  if (!elc) return null;

  // Retrieve contests
  const contests = await db
    .select()
    .from(electionContests)
    .where(eq(electionContests.electionId, electionId))
    .orderBy(asc(electionContests.contestOrder));

  // Retrieve candidates for all contests
  const contestIds = contests.map((c) => c.id);
  const candidates = contestIds.length > 0
    ? await db
        .select()
        .from(electionCandidates)
        .where(inArray(electionCandidates.contestId, contestIds))
        .orderBy(asc(electionCandidates.ballotOrder))
    : [];

  // Group candidates into contests
  const contestsWithCandidates = contests.map((contest) => ({
    ...contest,
    candidates: candidates.filter((c) => c.contestId === contest.id),
  }));

  // Elector statistics
  const [voterStats] = await db
    .select({
      totalEligible: sql<number>`count(*)::int`,
      votedCount: sql<number>`count(case when has_voted = true then 1 end)::int`,
    })
    .from(electionVoterRoll)
    .where(eq(electionVoterRoll.electionId, electionId));

  const totalEligible = voterStats?.totalEligible || 0;
  const votedCount = voterStats?.votedCount || 0;
  const turnoutRate = totalEligible > 0 ? Math.round((votedCount / totalEligible) * 1000) / 10 : 0;
  const quorumMet = turnoutRate >= elc.quorumPercentage;

  // Voter roll record for current user if supplied
  let userVoterRoll = null;
  if (currentIdentityId) {
    const [uvr] = await db
      .select()
      .from(electionVoterRoll)
      .where(
        and(
          eq(electionVoterRoll.electionId, electionId),
          eq(electionVoterRoll.identityId, currentIdentityId)
        )
      );
    userVoterRoll = uvr || null;
  }

  // Certification record if exists
  const [cert] = await db
    .select()
    .from(electionResultsCertifications)
    .where(eq(electionResultsCertifications.electionId, electionId));

  // Live tally for results (if certified or closed, or requested)
  const tally = await computeTally(electionId, contestsWithCandidates);

  return {
    ...elc,
    contests: contestsWithCandidates,
    totalEligibleVoters: totalEligible,
    ballotsCastCount: votedCount,
    turnoutPercentage: `${turnoutRate}%`,
    quorumMet,
    userVoterRoll,
    certification: cert || null,
    tally: elc.status === 'CERTIFIED' || elc.status === 'CLOSED' ? tally : null,
  };
}

/**
 * 3. COMPUTE TALLY FOR AN ELECTION
 * Anonymized aggregation from the secret ballot vault (election_ballots).
 */
export async function computeTally(electionId: string, contestsWithCandidates?: any[]) {
  if (!contestsWithCandidates) {
    const contests = await db
      .select()
      .from(electionContests)
      .where(eq(electionContests.electionId, electionId))
      .orderBy(asc(electionContests.contestOrder));

    const contestIds = contests.map((c) => c.id);
    const candidates = contestIds.length > 0
      ? await db
          .select()
          .from(electionCandidates)
          .where(inArray(electionCandidates.contestId, contestIds))
      : [];

    contestsWithCandidates = contests.map((c) => ({
      ...c,
      candidates: candidates.filter((cand) => cand.contestId === c.id),
    }));
  }

  const resultsByContest = await Promise.all(
    contestsWithCandidates.map(async (contest) => {
      // Count total votes cast for this contest
      const [contestBallots] = await db
        .select({
          totalCast: sql<number>`count(*)::int`,
          totalAbstain: sql<number>`count(case when is_abstention = true then 1 end)::int`,
        })
        .from(electionBallots)
        .where(
          and(
            eq(electionBallots.electionId, electionId),
            eq(electionBallots.contestId, contest.id)
          )
        );

      const totalContestVotes = contestBallots?.totalCast || 0;
      const totalAbstain = contestBallots?.totalAbstain || 0;

      // Votes per candidate
      const candidateTallies = await Promise.all(
        contest.candidates.map(async (cand: any) => {
          const [candVote] = await db
            .select({ votes: sql<number>`count(*)::int` })
            .from(electionBallots)
            .where(
              and(
                eq(electionBallots.electionId, electionId),
                eq(electionBallots.contestId, contest.id),
                eq(electionBallots.candidateId, cand.id)
              )
            );
          const votes = candVote?.votes || 0;
          const percentage = totalContestVotes > 0
            ? Math.round((votes / totalContestVotes) * 1000) / 10
            : 0;

          return {
            candidateId: cand.id,
            displayName: cand.displayName,
            manifesto: cand.manifesto,
            votes,
            percentage: `${percentage}%`,
            percentageRaw: percentage,
          };
        })
      );

      // Determine declared leader/winner
      const sorted = [...candidateTallies].sort((a, b) => b.votes - a.votes);
      const winner = sorted.length > 0 && sorted[0].votes > 0 ? sorted[0] : null;

      return {
        contestId: contest.id,
        contestTitle: contest.title,
        totalVotesCast: totalContestVotes,
        totalAbstentions: totalAbstain,
        candidates: candidateTallies,
        winner: winner ? { candidateId: winner.candidateId, displayName: winner.displayName, votes: winner.votes } : null,
      };
    })
  );

  return resultsByContest;
}

/**
 * 4. CREATE ELECTION
 */
export async function createElection(params: {
  tenantId: string;
  associationId: string;
  classSetId?: string;
  title: string;
  description: string;
  type?: string;
  scope?: string;
  quorumPercentage?: number;
  requiresFinancialGoodStanding?: boolean;
  requiresVerifiedStatus?: boolean;
  startTime: Date;
  endTime: Date;
  createdByIdentityId?: string;
}) {
  if (!params.title || !params.description) {
    throw new Error('Title and description are required.');
  }

  if (params.endTime <= params.startTime) {
    throw new Error('Voting end time must be strictly after start time.');
  }

  const electionId = `elc_${crypto.randomUUID().slice(0, 12)}`;

  const [record] = await db
    .insert(elections)
    .values({
      id: electionId,
      tenantId: params.tenantId,
      associationId: params.associationId,
      classSetId: params.classSetId || null,
      title: params.title,
      description: params.description,
      type: params.type || 'GENERAL_ELECTION',
      scope: params.scope || (params.classSetId ? 'CLASS_SET' : 'ASSOCIATION'),
      status: 'NOMINATIONS_OPEN',
      secretBallot: true,
      quorumPercentage: params.quorumPercentage !== undefined ? params.quorumPercentage : 25,
      requiresFinancialGoodStanding: params.requiresFinancialGoodStanding !== false,
      requiresVerifiedStatus: params.requiresVerifiedStatus !== false,
      startTime: params.startTime,
      endTime: params.endTime,
      createdByIdentityId: params.createdByIdentityId || null,
    })
    .returning();

  await recordAuditEvent({
    tenantId: params.tenantId,
    actorIdentityId: params.createdByIdentityId,
    action: 'CREATE_ELECTION',
    targetResource: `elections:${electionId}`,
    scope: 'ASSOCIATION',
    details: {
      title: params.title,
      type: record.type,
      quorumPercentage: record.quorumPercentage,
      startTime: params.startTime.toISOString(),
      endTime: params.endTime.toISOString(),
    },
  });

  return record;
}

/**
 * 5. UPDATE ELECTION STATUS
 */
export async function updateElectionStatus(
  electionId: string,
  newStatus: 'DRAFT' | 'NOMINATIONS_OPEN' | 'VETTING' | 'ACTIVE' | 'CLOSED' | 'CERTIFIED' | 'CANCELLED',
  actorIdentityId?: string
) {
  const [existing] = await db.select().from(elections).where(eq(elections.id, electionId));
  if (!existing) {
    throw new Error(`Election ${electionId} not found.`);
  }

  const [updated] = await db
    .update(elections)
    .set({
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(elections.id, electionId))
    .returning();

  await recordAuditEvent({
    tenantId: existing.tenantId,
    actorIdentityId,
    action: 'UPDATE_ELECTION_STATUS',
    targetResource: `elections:${electionId}`,
    scope: 'ASSOCIATION',
    details: {
      oldStatus: existing.status,
      newStatus,
    },
  });

  return updated;
}

/**
 * 6. ADD CONTEST
 */
export async function addElectionContest(params: {
  electionId: string;
  title: string;
  description?: string;
  contestOrder?: number;
  maxChoices?: number;
  allowAbstain?: boolean;
}) {
  const contestId = `cnt_${crypto.randomUUID().slice(0, 12)}`;

  const [contest] = await db
    .insert(electionContests)
    .values({
      id: contestId,
      electionId: params.electionId,
      title: params.title,
      description: params.description || null,
      contestOrder: params.contestOrder || 1,
      maxChoices: params.maxChoices || 1,
      allowAbstain: params.allowAbstain !== false,
    })
    .returning();

  return contest;
}

/**
 * 7. NOMINATE CANDIDATE
 */
export async function nominateCandidate(params: {
  contestId: string;
  candidateIdentityId?: string;
  displayName: string;
  manifesto?: string;
  ballotOrder?: number;
  vetted?: boolean;
  vettingNotes?: string;
  vettedByIdentityId?: string;
}) {
  const candidateId = `cnd_${crypto.randomUUID().slice(0, 12)}`;

  const [candidate] = await db
    .insert(electionCandidates)
    .values({
      id: candidateId,
      contestId: params.contestId,
      candidateIdentityId: params.candidateIdentityId || null,
      displayName: params.displayName,
      manifesto: params.manifesto || null,
      ballotOrder: params.ballotOrder || 1,
      status: params.vetted ? 'VETTED_APPROVED' : 'NOMINATED',
      vettingNotes: params.vettingNotes || null,
      vettedByIdentityId: params.vettedByIdentityId || null,
    })
    .returning();

  return candidate;
}

/**
 * 8. VET CANDIDATE
 */
export async function vetCandidate(
  candidateId: string,
  status: 'VETTED_APPROVED' | 'DISQUALIFIED' | 'WITHDRAWN',
  vettingNotes: string,
  vettedByIdentityId?: string
) {
  const [updated] = await db
    .update(electionCandidates)
    .set({
      status,
      vettingNotes,
      vettedByIdentityId: vettedByIdentityId || null,
    })
    .where(eq(electionCandidates.id, candidateId))
    .returning();

  return updated;
}

/**
 * 9. REGISTER VOTER TO VOTER ROLL
 */
export async function registerVoter(params: {
  electionId: string;
  identityId: string;
  eligibilityStatus?: 'ELIGIBLE' | 'INELIGIBLE_UNVERIFIED' | 'INELIGIBLE_ARREARS' | 'DISQUALIFIED';
  eligibilityReason?: string;
}) {
  // Check if voter already registered
  const [existing] = await db
    .select()
    .from(electionVoterRoll)
    .where(
      and(
        eq(electionVoterRoll.electionId, params.electionId),
        eq(electionVoterRoll.identityId, params.identityId)
      )
    );

  if (existing) {
    return existing;
  }

  const voterId = `vtr_${crypto.randomUUID().slice(0, 12)}`;

  const [voter] = await db
    .insert(electionVoterRoll)
    .values({
      id: voterId,
      electionId: params.electionId,
      identityId: params.identityId,
      eligibilityStatus: params.eligibilityStatus || 'ELIGIBLE',
      eligibilityReason: params.eligibilityReason || 'Verified Alumnus in Good Standing',
      hasVoted: false,
    })
    .returning();

  return voter;
}

/**
 * 10. CAST BALLOT (SECRET BALLOT ENCLAVE)
 * STRICT SECURITY CONSTITUTION:
 * 1. Verifies voter is registered and has status 'ELIGIBLE'.
 * 2. Checks double-voting: rejects if voter has already voted.
 * 3. Injects votes into `election_ballots` with a one-way blind cryptographic verification hash.
 * 4. NEVER associates identityId with candidate choices in election_ballots.
 * 5. Returns a cryptographic receipt token to the voter.
 */
export async function castBallot(params: {
  electionId: string;
  identityId: string;
  votes: Array<{
    contestId: string;
    candidateId?: string;
    isAbstention?: boolean;
  }>;
}) {
  const { electionId, identityId, votes } = params;

  // 1. Fetch Election
  const [election] = await db.select().from(elections).where(eq(elections.id, electionId));
  if (!election) {
    throw new Error('Election session not found.');
  }

  if (election.status !== 'ACTIVE') {
    throw new Error(`Election is not accepting ballots. Current status: ${election.status}.`);
  }

  const now = new Date();
  if (now < election.startTime) {
    throw new Error('Voting has not yet opened for this election.');
  }
  if (now > election.endTime) {
    throw new Error('Voting deadline has elapsed for this election.');
  }

  // 2. Fetch Voter Roll Record
  const [voter] = await db
    .select()
    .from(electionVoterRoll)
    .where(
      and(
        eq(electionVoterRoll.electionId, electionId),
        eq(electionVoterRoll.identityId, identityId)
      )
    );

  if (!voter) {
    throw new Error('You are not registered on the official voter roll for this election.');
  }

  if (voter.eligibilityStatus !== 'ELIGIBLE') {
    throw new Error(`Ineligible to vote: ${voter.eligibilityReason || voter.eligibilityStatus}`);
  }

  if (voter.hasVoted) {
    throw new Error('Double voting prohibited: You have already cast your ballot in this election.');
  }

  // 3. Validate Votes payload
  if (!votes || votes.length === 0) {
    throw new Error('Ballot submission must include choices for the contested offices.');
  }

  // Generate Blind Secret Ballot Submissions
  // Notice: election_ballots contains NO identityId column!
  const blindToken = crypto.randomBytes(32).toString('hex');
  const receiptToken = `REC-${crypto.createHash('sha256').update(electionId + identityId + blindToken).digest('hex').slice(0, 16).toUpperCase()}`;

  for (const vote of votes) {
    const blindVerificationHash = crypto
      .createHash('sha256')
      .update(electionId + vote.contestId + (vote.candidateId || 'ABSTAIN') + crypto.randomBytes(16).toString('hex'))
      .digest('hex');

    const ballotId = `blt_${crypto.randomUUID().slice(0, 12)}`;

    await db.insert(electionBallots).values({
      id: ballotId,
      electionId,
      contestId: vote.contestId,
      candidateId: vote.candidateId || null,
      isAbstention: vote.isAbstention === true || !vote.candidateId,
      castAt: new Date(),
      blindVerificationHash,
    });
  }

  // 4. Mark Voter Roll as Voted with receipt token
  await db
    .update(electionVoterRoll)
    .set({
      hasVoted: true,
      votedAt: new Date(),
      ballotReceiptToken: receiptToken,
    })
    .where(eq(electionVoterRoll.id, voter.id));

  // 5. Record Audit Event (Anonymized - logs that a voter voted, NOT what they voted for)
  await recordAuditEvent({
    tenantId: election.tenantId,
    actorIdentityId: identityId,
    action: 'CAST_SECRET_BALLOT',
    targetResource: `election_voter_roll:${voter.id}`,
    scope: 'ASSOCIATION',
    details: {
      electionId,
      ballotReceiptToken: receiptToken,
      contestsCount: votes.length,
      timestamp: new Date().toISOString(),
    },
  });

  return {
    success: true,
    ballotReceiptToken: receiptToken,
    votedAt: new Date().toISOString(),
    message: 'Secret ballot successfully deposited into the cryptographic ballot vault.',
  };
}

/**
 * 11. CERTIFY ELECTION RESULTS (OFFICIAL RETURNING OFFICER / ELECO)
 * Tally computation, quorum calculation, and cryptographic seal generation.
 */
export async function certifyElectionResults(params: {
  electionId: string;
  certifiedByIdentityId?: string;
  returningOfficerNotes?: string;
}) {
  const { electionId, certifiedByIdentityId, returningOfficerNotes } = params;

  const [election] = await db.select().from(elections).where(eq(elections.id, electionId));
  if (!election) {
    throw new Error('Election not found.');
  }

  // Voter roll totals
  const [voterStats] = await db
    .select({
      totalEligible: sql<number>`count(*)::int`,
      votedCount: sql<number>`count(case when has_voted = true then 1 end)::int`,
    })
    .from(electionVoterRoll)
    .where(eq(electionVoterRoll.electionId, electionId));

  const totalRegistered = voterStats?.totalEligible || 0;
  const totalCast = voterStats?.votedCount || 0;
  const turnoutRate = totalRegistered > 0 ? Math.round((totalCast / totalRegistered) * 1000) / 10 : 0;
  const quorumAchieved = turnoutRate >= election.quorumPercentage;

  // Compute Full Contest Tally
  const tally = await computeTally(electionId);

  // Generate SHA-256 Tamper-Evident Certification Seal
  const sealPayload = {
    electionId,
    associationId: election.associationId,
    title: election.title,
    totalRegisteredElectors: totalRegistered,
    totalBallotsCast: totalCast,
    turnoutPercentage: `${turnoutRate}%`,
    quorumRequiredPercentage: election.quorumPercentage,
    quorumAchieved,
    tally,
    certifiedBy: certifiedByIdentityId || 'ELECO_RETURNING_OFFICER',
    certifiedAt: new Date().toISOString(),
  };

  const certificationSeal = crypto
    .createHash('sha256')
    .update(JSON.stringify(sealPayload))
    .digest('hex');

  // Insert Certification Record
  const certId = `crt_${crypto.randomUUID().slice(0, 12)}`;
  const [certRecord] = await db
    .insert(electionResultsCertifications)
    .values({
      id: certId,
      electionId,
      certifiedByIdentityId: certifiedByIdentityId || null,
      totalRegisteredElectors: totalRegistered,
      totalBallotsCast: totalCast,
      turnoutPercentage: `${turnoutRate}%`,
      quorumRequiredPercentage: election.quorumPercentage,
      quorumAchieved,
      tallySummaryJson: tally,
      certificationSeal,
      returningOfficerNotes: returningOfficerNotes || 'ELECO formal certification complete.',
    })
    .onConflictDoUpdate({
      target: electionResultsCertifications.electionId,
      set: {
        totalRegisteredElectors: totalRegistered,
        totalBallotsCast: totalCast,
        turnoutPercentage: `${turnoutRate}%`,
        quorumAchieved,
        tallySummaryJson: tally,
        certificationSeal,
        returningOfficerNotes: returningOfficerNotes || 'ELECO formal certification updated.',
      },
    })
    .returning();

  // Update Election state to CERTIFIED
  await db
    .update(elections)
    .set({
      status: 'CERTIFIED',
      certifiedAt: new Date(),
      certifiedByIdentityId: certifiedByIdentityId || null,
      certificationNotes: returningOfficerNotes || 'Officially certified by Returning Officer.',
      certificationSealHash: certificationSeal,
      updatedAt: new Date(),
    })
    .where(eq(elections.id, electionId));

  // Record Audit Event
  await recordAuditEvent({
    tenantId: election.tenantId,
    actorIdentityId: certifiedByIdentityId,
    action: 'CERTIFY_ELECTION_RESULTS',
    targetResource: `elections:${electionId}`,
    scope: 'ASSOCIATION',
    details: {
      totalRegisteredElectors: totalRegistered,
      totalBallotsCast: totalCast,
      turnoutPercentage: `${turnoutRate}%`,
      quorumAchieved,
      certificationSeal,
    },
  });

  return {
    success: true,
    certification: certRecord,
    seal: certificationSeal,
    quorumAchieved,
    message: quorumAchieved
      ? 'Election results certified with statutory quorum achieved.'
      : 'Election certified: WARNING - Turnout fell short of constitutional quorum.',
  };
}

/**
 * 12. SEED BASELINE ELECTIONS IF EMPTY
 * Seeds canonical AGSOBA elections & referendums with verified candidates and electors.
 */
export async function seedBaselineElectionsIfEmpty() {
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(elections);
  if (count && count.count > 0) {
    return { seeded: false, count: count.count };
  }

  const [agsobaTenant] = await db.select().from(tenants).where(eq(tenants.code, 'ags'));
  const [agsobaAssoc] = await db.select().from(associations).where(eq(associations.acronym, 'AGSOBA'));

  if (!agsobaTenant || !agsobaAssoc) {
    return { seeded: false, reason: 'Tenant or Association not found' };
  }

  // Fetch verified identities for voters and candidates
  const allIdentities = await db.select().from(identities).limit(10);
  const officerIdentity = allIdentities[0]?.id;

  // 1. GENERAL ELECTION: AGSOBA National Executive Council Elections 2026
  const elc1Id = 'elc_agsoba_gen_2026';
  const now = new Date();
  const startTime = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  const endTime = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

  await db.insert(elections).values({
    id: elc1Id,
    tenantId: agsobaTenant.id,
    associationId: agsobaAssoc.id,
    title: 'AGSOBA National Executive Council Triennial Elections (2026–2029)',
    description: 'Statutory election of principal national officers of the Abeokuta Grammar School Old Boys Association in accordance with the AGSOBA Constitution Article 8.',
    type: 'GENERAL_ELECTION',
    scope: 'ASSOCIATION',
    status: 'ACTIVE',
    secretBallot: true,
    quorumPercentage: 25,
    requiresFinancialGoodStanding: true,
    requiresVerifiedStatus: true,
    startTime,
    endTime,
    createdByIdentityId: officerIdentity || null,
  });

  // Contest 1: Global President General
  const cnt1Id = 'cnt_pres_gen_2026';
  await db.insert(electionContests).values({
    id: cnt1Id,
    electionId: elc1Id,
    title: 'Global President General',
    description: 'Chief Executive Officer and representative of the Association worldwide.',
    contestOrder: 1,
    maxChoices: 1,
    allowAbstain: true,
  });

  // Candidates for President General
  const cnd1Id = 'cnd_pres_olagunju';
  await db.insert(electionCandidates).values({
    id: cnd1Id,
    contestId: cnt1Id,
    displayName: 'Engr. Dapo Olagunju (1981-86 Set)',
    manifesto: 'Transforming AGSOBA into a global endowment-driven alumni powerhouse. Completion of the Centennial STEM Academy and digitizing worldwide branch chapters.',
    ballotOrder: 1,
    status: 'VETTED_APPROVED',
    vettingNotes: 'ELECO cleared: 2024-2026 National dues verified, life patron endorsement confirmed.',
  });

  const cnd2Id = 'cnd_pres_sowande';
  await db.insert(electionCandidates).values({
    id: cnd2Id,
    contestId: cnt1Id,
    displayName: 'Chief Kayode Sowande (1979-84 Set)',
    manifesto: 'Reinvigorating class-set mentorship for young graduates, establishing the AGSOBA Healthcare Benevolent Trust, and expanding regional branch charters.',
    ballotOrder: 2,
    status: 'VETTED_APPROVED',
    vettingNotes: 'ELECO cleared: Constitutional qualification verified, branch executive sponsor vetted.',
  });

  // Contest 2: National Secretary General
  const cnt2Id = 'cnt_sec_gen_2026';
  await db.insert(electionContests).values({
    id: cnt2Id,
    electionId: elc1Id,
    title: 'National Secretary General',
    description: 'Keeper of records, meeting minutes, secretarial administration, and constitutional correspondence.',
    contestOrder: 2,
    maxChoices: 1,
    allowAbstain: true,
  });

  const cnd3Id = 'cnd_sec_adebayo';
  await db.insert(electionCandidates).values({
    id: cnd3Id,
    contestId: cnt2Id,
    displayName: 'Dr. Olusola Adebayo (1990-95 Set)',
    manifesto: 'Digital governance transparency, automated minute repositories, cloud archival of historical artifacts, and prompt communication.',
    ballotOrder: 1,
    status: 'VETTED_APPROVED',
    vettingNotes: 'ELECO cleared: Good standing certified.',
  });

  const cnd4Id = 'cnd_sec_badmus';
  await db.insert(electionCandidates).values({
    id: cnd4Id,
    contestId: cnt2Id,
    displayName: 'Barrister Femi Badmus (1988-93 Set)',
    manifesto: 'Constitutional fidelity, legal defense of AGSOBA assets, and standardized branch dispute resolution.',
    ballotOrder: 2,
    status: 'VETTED_APPROVED',
    vettingNotes: 'ELECO cleared: Good standing certified.',
  });

  // 2. CONSTITUTIONAL REFERENDUM: AGSOBA Endowment Fund Charter Amendment
  const elc2Id = 'elc_agsoba_ref_2026';
  await db.insert(elections).values({
    id: elc2Id,
    tenantId: agsobaTenant.id,
    associationId: agsobaAssoc.id,
    title: 'Constitutional Referendum: Establishment of Ring-Fenced ₦500M Endowment Fund',
    description: 'Formal plebiscite to amend Section 14 of the AGSOBA Constitution dedicating 30% of all national levy receipts into an inviolable Capital Preservation Endowment.',
    type: 'CONSTITUTIONAL_REFERENDUM',
    scope: 'ASSOCIATION',
    status: 'ACTIVE',
    secretBallot: true,
    quorumPercentage: 30, // 30% quorum required for constitutional amendment
    requiresFinancialGoodStanding: true,
    requiresVerifiedStatus: true,
    startTime,
    endTime,
    createdByIdentityId: officerIdentity || null,
  });

  const cntRefId = 'cnt_ref_amend_sec14';
  await db.insert(electionContests).values({
    id: cntRefId,
    electionId: elc2Id,
    title: 'Referendum Motion: Approve Amendment to Section 14 (Endowment Fund)',
    description: 'Do you vote to adopt the amendment creating the ring-fenced AGSOBA Capital Preservation Endowment Fund governed by independent trustees?',
    contestOrder: 1,
    maxChoices: 1,
    allowAbstain: true,
  });

  await db.insert(electionCandidates).values({
    id: 'cnd_ref_yes',
    contestId: cntRefId,
    displayName: 'YES — IN FAVOUR OF AMENDMENT',
    manifesto: 'Approve the constitutional ring-fencing of 30% of national dues into the long-term endowment fund.',
    ballotOrder: 1,
    status: 'VETTED_APPROVED',
  });

  await db.insert(electionCandidates).values({
    id: 'cnd_ref_no',
    contestId: cntRefId,
    displayName: 'NO — AGAINST AMENDMENT',
    manifesto: 'Reject the proposed amendment and maintain current flexible budgeting allocations.',
    ballotOrder: 2,
    status: 'VETTED_APPROVED',
  });

  // Register all verified identities on the voter roll
  for (const ident of allIdentities) {
    // Elector for Election 1
    await registerVoter({
      electionId: elc1Id,
      identityId: ident.id,
      eligibilityStatus: 'ELIGIBLE',
      eligibilityReason: 'Verified AGSOBA Alumnus in Good Standing',
    });

    // Elector for Referendum
    await registerVoter({
      electionId: elc2Id,
      identityId: ident.id,
      eligibilityStatus: 'ELIGIBLE',
      eligibilityReason: 'Verified AGSOBA Alumnus in Good Standing',
    });
  }

  // Pre-seed a few anonymous secret ballots into the vault from early voters (e.g. 2 ballots)
  if (allIdentities.length >= 2) {
    // Ballot 1
    await castBallot({
      electionId: elc1Id,
      identityId: allIdentities[0].id,
      votes: [
        { contestId: cnt1Id, candidateId: cnd1Id },
        { contestId: cnt2Id, candidateId: cnd3Id },
      ],
    });

    // Ballot 2
    await castBallot({
      electionId: elc1Id,
      identityId: allIdentities[1].id,
      votes: [
        { contestId: cnt1Id, candidateId: cnd2Id },
        { contestId: cnt2Id, candidateId: cnd3Id },
      ],
    });

    // Referendum Ballot
    await castBallot({
      electionId: elc2Id,
      identityId: allIdentities[0].id,
      votes: [
        { contestId: cntRefId, candidateId: 'cnd_ref_yes' },
      ],
    });
  }

  return { seeded: true, count: 2 };
}

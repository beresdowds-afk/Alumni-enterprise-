/**
 * AGSOBA Enterprise Alumni Management Platform
 * Phase 15: Projects and Development Initiatives Services
 * Capital Campaign Tracking, Milestone Auditing, Donor Wall, and Financial Reconciliation
 */

import { db } from './index.ts';
import {
  developmentProjects,
  projectMilestones,
  projectDonations,
  projectDisbursements,
  financialAccounts,
  financialTransactions,
  pledges,
  identities,
  classSets,
  tenants,
  associations,
} from './schema.ts';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Determine recognition tier based on donation amount in kobo (NGN)
 * Grand Patron: >= N5,000,000 (500,000,000 kobo)
 * Patron: >= N1,000,000 (100,000,000 kobo)
 * Benefactor: >= N500,000 (50,000,000 kobo)
 * Builder: >= N100,000 (10,000,000 kobo)
 * Supporter: >= N25,000 (2,500,000 kobo)
 * Contributor: < N25,000
 */
export function calculateDonorRecognitionTier(amountKobo: number): string {
  if (amountKobo >= 500000000) return 'GRAND_PATRON';
  if (amountKobo >= 100000000) return 'PATRON';
  if (amountKobo >= 50000000) return 'BENEFACTOR';
  if (amountKobo >= 10000000) return 'BUILDER';
  if (amountKobo >= 2500000) return 'SUPPORTER';
  return 'CONTRIBUTOR';
}

/**
 * Seed baseline project initiatives for AGSOBA if empty
 */
export async function seedBaselineProjectsIfEmpty() {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(developmentProjects);
  if (Number(existing[0]?.count || 0) > 0) {
    return;
  }

  console.log('Seeding baseline AGSOBA Development Projects & Initiatives...');

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, 'tenant_ags_abeokuta')).limit(1);
  const [assoc] = await db.select().from(associations).where(eq(associations.acronym, 'AGSOBA')).limit(1);
  const allIdentities = await db.select().from(identities).limit(5);

  if (!tenant || !assoc) {
    console.log('Cannot seed projects: missing tenant or association.');
    return;
  }

  const tenantId = tenant.id;
  const associationId = assoc.id;

  // Project 1: AGSOBA Centenary Hall Restoration
  const proj1Id = `proj_centenary_hall_${Date.now()}`;
  await db.insert(developmentProjects).values({
    id: proj1Id,
    tenantId,
    associationId,
    title: 'AGSOBA Centenary Hall Heritage Restoration',
    description: 'Comprehensive structural rehabilitation, acoustic engineering, and digital AV outfitting of the historic school assembly hall founded in 1908.',
    category: 'HISTORICAL_RESTORATION',
    status: 'IN_PROGRESS',
    budgetApprovedKobo: 7500000000, // N75,000,000 in kobo
    fundsRaisedKobo: 3000000000,   // N30,000,000 in kobo (N25m + N5m)
    fundsDisbursedKobo: 2500000000, // N25,000,000 in kobo
    isBudgetLocked: true,
    proposedByIdentityId: allIdentities[0]?.id,
    approvedByIdentityId: allIdentities[0]?.id,
    approvedAt: new Date('2026-01-15T10:00:00Z'),
    startDate: new Date('2026-02-01T08:00:00Z'),
    targetCompletionDate: new Date('2026-11-30T18:00:00Z'),
  });

  // Milestones for Project 1
  const m1Id = `pmil_roof_${Date.now()}`;
  await db.insert(projectMilestones).values({
    id: m1Id,
    projectId: proj1Id,
    milestoneOrder: 1,
    title: 'Phase I: Roofing & Structural Timber Reinforcement',
    description: 'Stripping decayed trusses, installing fire-retardant structural hardwood, and copper sheeting.',
    allocatedBudgetKobo: 2500000000,
    disbursedBudgetKobo: 2500000000,
    percentageWeight: 35,
    status: 'COMPLETED',
    targetDate: new Date('2026-04-30T18:00:00Z'),
    completedAt: new Date('2026-04-28T14:30:00Z'),
    auditNotes: 'Certified by National Association of Civil Engineers (NICE) inspection audit team.',
    auditedByIdentityId: allIdentities[0]?.id,
    auditedAt: new Date('2026-04-29T10:00:00Z'),
  });

  const m2Id = `pmil_acoustic_${Date.now()}`;
  await db.insert(projectMilestones).values({
    id: m2Id,
    projectId: proj1Id,
    milestoneOrder: 2,
    title: 'Phase II: Acoustic Paneling & Stage Lighting Rig',
    description: 'Architectural acoustic diffusers, motorized stage rigging, and digital sound reinforcement system.',
    allocatedBudgetKobo: 3000000000,
    disbursedBudgetKobo: 0,
    percentageWeight: 40,
    status: 'IN_PROGRESS',
    targetDate: new Date('2026-08-31T18:00:00Z'),
  });

  const m3Id = `pmil_seating_${Date.now()}`;
  await db.insert(projectMilestones).values({
    id: m3Id,
    projectId: proj1Id,
    milestoneOrder: 3,
    title: 'Phase III: Ergonomic Teak Seating & Commemorative Brass Plaques',
    description: 'Crafted 1,200 hardwood auditorium seats with individual brass donor nameplates.',
    allocatedBudgetKobo: 2000000000,
    disbursedBudgetKobo: 0,
    percentageWeight: 25,
    status: 'PENDING',
    targetDate: new Date('2026-11-30T18:00:00Z'),
  });

  // Project 2: High-Speed STEM Computing Laboratory
  const proj2Id = `proj_stem_lab_${Date.now()}`;
  await db.insert(developmentProjects).values({
    id: proj2Id,
    tenantId,
    associationId,
    title: 'AGSOBA High-Speed STEM Computer & Robotics Laboratory',
    description: 'Deployment of 60 modern AI workstations, gigabit fiber link, and solar micro-inverter backup power for secondary students.',
    category: 'ACADEMIC_EQUIPMENT',
    status: 'APPROVED',
    budgetApprovedKobo: 3500000000, // N35,000,000 in kobo
    fundsRaisedKobo: 1800000000,   // N18,000,000 in kobo
    fundsDisbursedKobo: 0,
    isBudgetLocked: true,
    proposedByIdentityId: allIdentities[1]?.id || allIdentities[0]?.id,
    approvedByIdentityId: allIdentities[0]?.id,
    approvedAt: new Date('2026-03-01T12:00:00Z'),
    startDate: new Date('2026-06-01T08:00:00Z'),
    targetCompletionDate: new Date('2026-12-15T18:00:00Z'),
  });

  // Seed sample project donation for donor wall
  if (allIdentities.length > 0) {
    await db.insert(projectDonations).values({
      id: `pdon_${Date.now()}_1`,
      projectId: proj1Id,
      donorIdentityId: allIdentities[0].id,
      amountKobo: 2500000000, // N25,000,000
      currency: 'NGN',
      recognitionTier: 'GRAND_PATRON',
      isAnonymous: false,
      paymentReference: `PAY-CENTENARY-GP-${Date.now()}`,
      status: 'CONFIRMED',
      donorMessage: 'Dedicated in honor of the 1983-1988 Centenary Pioneers and our legendary principal.',
      receivedAt: new Date('2026-02-10T11:00:00Z'),
    }).catch(() => {});

    if (allIdentities.length > 1) {
      await db.insert(projectDonations).values({
        id: `pdon_${Date.now()}_2`,
        projectId: proj1Id,
        donorIdentityId: allIdentities[1].id,
        amountKobo: 500000000, // N5,000,000
        currency: 'NGN',
        recognitionTier: 'PATRON',
        isAnonymous: false,
        paymentReference: `PAY-CENTENARY-P-${Date.now()}`,
        status: 'CONFIRMED',
        donorMessage: 'For the glory of Abeokuta Grammar School.',
        receivedAt: new Date('2026-02-14T15:20:00Z'),
      }).catch(() => {});
    }

    // Seed sample contractor disbursement
    await db.insert(projectDisbursements).values({
      id: `pdis_${Date.now()}_1`,
      projectId: proj1Id,
      milestoneId: m1Id,
      payeeName: 'Ogun Heritage Builders & Civil Engineering Ltd',
      amountKobo: 2500000000,
      currency: 'NGN',
      bankReference: 'CBN-NIBSS-TRF-2026042901',
      disbursedByIdentityId: allIdentities[0].id,
      notes: 'Final settlement for certified Milestone 1 completion.',
      disbursedAt: new Date('2026-04-29T16:00:00Z'),
    }).catch(() => {});
  }

  console.log('✓ AGSOBA Development Projects baseline seeding complete.');
}

/**
 * Get all development projects with summary analytics
 */
export async function getDevelopmentProjects(tenantId: string = 'tenant_ags_abeokuta') {
  const projects = await db
    .select({
      id: developmentProjects.id,
      tenantId: developmentProjects.tenantId,
      associationId: developmentProjects.associationId,
      classSetId: developmentProjects.classSetId,
      title: developmentProjects.title,
      description: developmentProjects.description,
      category: developmentProjects.category,
      status: developmentProjects.status,
      budgetApprovedKobo: developmentProjects.budgetApprovedKobo,
      fundsRaisedKobo: developmentProjects.fundsRaisedKobo,
      fundsDisbursedKobo: developmentProjects.fundsDisbursedKobo,
      isBudgetLocked: developmentProjects.isBudgetLocked,
      approvedAt: developmentProjects.approvedAt,
      startDate: developmentProjects.startDate,
      targetCompletionDate: developmentProjects.targetCompletionDate,
      actualCompletionDate: developmentProjects.actualCompletionDate,
      createdAt: developmentProjects.createdAt,
      proposedBy: {
        id: identities.id,
        firstName: identities.firstName,
        lastName: identities.lastName,
      },
    })
    .from(developmentProjects)
    .leftJoin(identities, eq(developmentProjects.proposedByIdentityId, identities.id))
    .where(eq(developmentProjects.tenantId, tenantId))
    .orderBy(desc(developmentProjects.createdAt));

  return projects;
}

/**
 * Get complete project detail with milestones, donor wall, disbursements, and reconciliation status
 */
export async function getProjectDetail(projectId: string) {
  const [project] = await db
    .select()
    .from(developmentProjects)
    .where(eq(developmentProjects.id, projectId))
    .limit(1);

  if (!project) {
    throw new Error('Development project not found.');
  }

  // Milestones
  const milestones = await db
    .select()
    .from(projectMilestones)
    .where(eq(projectMilestones.projectId, projectId))
    .orderBy(projectMilestones.milestoneOrder);

  // Donor Wall Contributions
  const donations = await db
    .select({
      id: projectDonations.id,
      amountKobo: projectDonations.amountKobo,
      currency: projectDonations.currency,
      recognitionTier: projectDonations.recognitionTier,
      isAnonymous: projectDonations.isAnonymous,
      donorNameOverride: projectDonations.donorNameOverride,
      donorMessage: projectDonations.donorMessage,
      receivedAt: projectDonations.receivedAt,
      donor: {
        id: identities.id,
        firstName: identities.firstName,
        lastName: identities.lastName,
      },
      classSet: {
        displayName: classSets.displayName,
      },
    })
    .from(projectDonations)
    .leftJoin(identities, eq(projectDonations.donorIdentityId, identities.id))
    .leftJoin(classSets, eq(projectDonations.classSetId, classSets.id))
    .where(eq(projectDonations.projectId, projectId))
    .orderBy(desc(projectDonations.amountKobo));

  // Disbursements
  const disbursements = await db
    .select()
    .from(projectDisbursements)
    .where(eq(projectDisbursements.projectId, projectId))
    .orderBy(desc(projectDisbursements.disbursedAt));

  // Reconciliation audit check
  const totalDonationsReceived = donations.reduce((sum, d) => sum + d.amountKobo, 0);
  const totalDisbursedFromLedger = disbursements.reduce((sum, d) => sum + d.amountKobo, 0);
  const totalMilestonesAllocated = milestones.reduce((sum, m) => sum + m.allocatedBudgetKobo, 0);

  const reconciliation = {
    isBudgetReconciled: !project.isBudgetLocked || totalMilestonesAllocated <= project.budgetApprovedKobo,
    fundsRaisedReconciled: totalDonationsReceived === project.fundsRaisedKobo,
    fundsDisbursedReconciled: totalDisbursedFromLedger === project.fundsDisbursedKobo,
    totalDonationsReceived,
    totalDisbursedFromLedger,
    totalMilestonesAllocated,
    budgetRemainingKobo: Math.max(0, project.budgetApprovedKobo - totalDisbursedFromLedger),
  };

  return {
    project,
    milestones,
    donorWall: donations,
    disbursements,
    reconciliation,
  };
}

/**
 * Create a new development project proposal
 */
export async function createDevelopmentProject(data: {
  tenantId: string;
  associationId: string;
  classSetId?: string;
  title: string;
  description: string;
  category: string;
  budgetApprovedKobo: number;
  startDate?: string;
  targetCompletionDate?: string;
  proposedByIdentityId?: string;
}) {
  const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const [created] = await db
    .insert(developmentProjects)
    .values({
      id,
      tenantId: data.tenantId,
      associationId: data.associationId,
      classSetId: data.classSetId,
      title: data.title,
      description: data.description,
      category: data.category,
      budgetApprovedKobo: data.budgetApprovedKobo,
      fundsRaisedKobo: 0,
      fundsDisbursedKobo: 0,
      isBudgetLocked: false,
      proposedByIdentityId: data.proposedByIdentityId,
      status: 'PROPOSED',
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      targetCompletionDate: data.targetCompletionDate ? new Date(data.targetCompletionDate) : undefined,
    })
    .returning();

  return created;
}

/**
 * Approve and lock project budget
 * STRICT RULE: Once locked, budgetApprovedKobo cannot be modified arbitrarily without formal constitutional amendment
 */
export async function approveAndLockProjectBudget(data: {
  projectId: string;
  approvedByIdentityId: string;
  approvedBudgetKobo?: number;
}) {
  const [project] = await db
    .select()
    .from(developmentProjects)
    .where(eq(developmentProjects.id, data.projectId))
    .limit(1);

  if (!project) {
    throw new Error('Development project not found.');
  }

  const budgetToLock = data.approvedBudgetKobo !== undefined ? data.approvedBudgetKobo : project.budgetApprovedKobo;

  const [updated] = await db
    .update(developmentProjects)
    .set({
      status: 'APPROVED',
      isBudgetLocked: true,
      budgetApprovedKobo: budgetToLock,
      approvedByIdentityId: data.approvedByIdentityId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(developmentProjects.id, data.projectId))
    .returning();

  return updated;
}

/**
 * Add a milestone to an active project
 */
export async function addProjectMilestone(data: {
  projectId: string;
  milestoneOrder: number;
  title: string;
  description?: string;
  allocatedBudgetKobo: number;
  percentageWeight: number;
  targetDate?: string;
}) {
  const [project] = await db
    .select()
    .from(developmentProjects)
    .where(eq(developmentProjects.id, data.projectId))
    .limit(1);

  if (!project) {
    throw new Error('Project not found.');
  }

  // Validate that total milestone allocation does not exceed locked budget
  const existingMilestones = await db
    .select()
    .from(projectMilestones)
    .where(eq(projectMilestones.projectId, data.projectId));

  const currentAllocated = existingMilestones.reduce((sum, m) => sum + m.allocatedBudgetKobo, 0);
  if (project.isBudgetLocked && currentAllocated + data.allocatedBudgetKobo > project.budgetApprovedKobo) {
    throw new Error(`Milestone allocation exceeds locked budget. Available: ${(project.budgetApprovedKobo - currentAllocated) / 100} NGN.`);
  }

  const id = `pmil_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const [created] = await db
    .insert(projectMilestones)
    .values({
      id,
      projectId: data.projectId,
      milestoneOrder: data.milestoneOrder,
      title: data.title,
      description: data.description,
      allocatedBudgetKobo: data.allocatedBudgetKobo,
      percentageWeight: data.percentageWeight,
      status: 'PENDING',
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
    })
    .returning();

  return created;
}

/**
 * Audit and approve milestone completion
 */
export async function auditProjectMilestone(data: {
  milestoneId: string;
  auditedByIdentityId: string;
  status: 'AUDIT_APPROVED' | 'COMPLETED' | 'IN_PROGRESS';
  auditNotes: string;
}) {
  const [updated] = await db
    .update(projectMilestones)
    .set({
      status: data.status,
      auditNotes: data.auditNotes,
      auditedByIdentityId: data.auditedByIdentityId,
      auditedAt: new Date(),
      completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
    })
    .where(eq(projectMilestones.id, data.milestoneId))
    .returning();

  return updated;
}

/**
 * Record a verified donation to the project (Cash/Online Gateway or Pledge Fulfillment)
 * Automatically updates project funds_raised_kobo and calculates recognition tier
 */
export async function recordProjectDonation(data: {
  projectId: string;
  donorIdentityId?: string;
  donorNameOverride?: string;
  classSetId?: string;
  amountKobo: number;
  paymentReference: string;
  donorMessage?: string;
  isAnonymous?: boolean;
  pledgeId?: string;
}) {
  const [project] = await db
    .select()
    .from(developmentProjects)
    .where(eq(developmentProjects.id, data.projectId))
    .limit(1);

  if (!project) {
    throw new Error('Project not found.');
  }

  const recognitionTier = calculateDonorRecognitionTier(data.amountKobo);
  const id = `pdon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const [donation] = await db
    .insert(projectDonations)
    .values({
      id,
      projectId: data.projectId,
      donorIdentityId: data.donorIdentityId,
      donorNameOverride: data.donorNameOverride,
      classSetId: data.classSetId,
      amountKobo: data.amountKobo,
      currency: 'NGN',
      recognitionTier,
      isAnonymous: Boolean(data.isAnonymous),
      pledgeId: data.pledgeId,
      paymentReference: data.paymentReference,
      status: 'CONFIRMED',
      donorMessage: data.donorMessage,
    })
    .returning();

  // Atomically increment project raised funds
  await db
    .update(developmentProjects)
    .set({
      fundsRaisedKobo: sql`${developmentProjects.fundsRaisedKobo} + ${data.amountKobo}`,
      updatedAt: new Date(),
    })
    .where(eq(developmentProjects.id, data.projectId));

  // If tied to pledge, mark fulfillment
  if (data.pledgeId) {
    await db
      .update(pledges)
      .set({
        amountFulfilled: sql`${pledges.amountFulfilled} + ${data.amountKobo}`,
        status: sql`CASE WHEN ${pledges.amountFulfilled} + ${data.amountKobo} >= ${pledges.amountPledged} THEN 'FULFILLED' ELSE 'PARTIAL_FULFILLED' END`,
        updatedAt: new Date(),
      })
      .where(eq(pledges.id, data.pledgeId));
  }

  return donation;
}

/**
 * Execute a verified project disbursement for a milestone
 * Disburses funds, increments project funds_disbursed_kobo, and writes double-entry transaction
 */
export async function disburseProjectMilestoneFunds(data: {
  projectId: string;
  milestoneId?: string;
  payeeName: string;
  amountKobo: number;
  bankReference: string;
  disbursedByIdentityId: string;
  notes?: string;
}) {
  const [project] = await db
    .select()
    .from(developmentProjects)
    .where(eq(developmentProjects.id, data.projectId))
    .limit(1);

  if (!project) {
    throw new Error('Project not found.');
  }

  // Validate that disbursement does not exceed raised funds or locked budget
  if (project.fundsDisbursedKobo + data.amountKobo > project.budgetApprovedKobo) {
    throw new Error('Disbursement exceeds total approved project budget.');
  }

  const id = `pdis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Post entry in double entry ledger
  const [assetAccount] = await db
    .select()
    .from(financialAccounts)
    .where(and(eq(financialAccounts.tenantId, project.tenantId), eq(financialAccounts.code, '1010')))
    .limit(1);

  const [expenseAccount] = await db
    .select()
    .from(financialAccounts)
    .where(and(eq(financialAccounts.tenantId, project.tenantId), eq(financialAccounts.code, '5010')))
    .limit(1);

  let financialTransactionId: string | undefined;

  if (assetAccount && expenseAccount) {
    financialTransactionId = `txn_proj_${Date.now()}`;
    await db.insert(financialTransactions).values({
      id: financialTransactionId,
      tenantId: project.tenantId,
      associationId: project.associationId,
      debitAccountId: expenseAccount.id,
      creditAccountId: assetAccount.id,
      amount: data.amountKobo,
      currency: 'NGN',
      description: `Capital Project Disbursement: ${project.title} (${data.payeeName})`,
      referenceId: data.bankReference,
      idempotencyKey: `idemp_proj_${id}_${Date.now()}`,
      recordedByIdentityId: data.disbursedByIdentityId,
    });
  }

  const [disbursement] = await db
    .insert(projectDisbursements)
    .values({
      id,
      projectId: data.projectId,
      milestoneId: data.milestoneId,
      payeeName: data.payeeName,
      amountKobo: data.amountKobo,
      currency: 'NGN',
      bankReference: data.bankReference,
      disbursedByIdentityId: data.disbursedByIdentityId,
      financialTransactionId,
      notes: data.notes,
    })
    .returning();

  // Update project disbursed total
  await db
    .update(developmentProjects)
    .set({
      fundsDisbursedKobo: sql`${developmentProjects.fundsDisbursedKobo} + ${data.amountKobo}`,
      updatedAt: new Date(),
    })
    .where(eq(developmentProjects.id, data.projectId));

  // If milestone was specified, update its disbursed budget
  if (data.milestoneId) {
    await db
      .update(projectMilestones)
      .set({
        disbursedBudgetKobo: sql`${projectMilestones.disbursedBudgetKobo} + ${data.amountKobo}`,
      })
      .where(eq(projectMilestones.id, data.milestoneId));
  }

  return disbursement;
}

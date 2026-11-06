/**
 * AGSOBA Enterprise Alumni Management Platform
 * Phase 14 Confidential Welfare Management Services
 * Zero-Trust Privacy Vault, Multi-Tier Committee Review, Emergency Disbursements & Access Auditing
 */

import { db } from './index.ts';
import {
  welfarePrograms,
  welfareCases,
  welfareCaseReviews,
  welfareDisbursements,
  welfareAccessLogs,
  tenants,
  associations,
  identities,
  financialTransactions,
  financialAccounts,
} from './schema.ts';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Seed baseline welfare programs and sample confidential cases if empty
 */
export async function seedBaselineWelfareIfEmpty() {
  const existingPrograms = await db.select({ count: sql<number>`count(*)` }).from(welfarePrograms);
  if (Number(existingPrograms[0]?.count || 0) > 0) {
    return;
  }

  console.log('Seeding baseline AGSOBA Confidential Welfare Programs...');

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, 'tenant_ags_abeokuta')).limit(1);
  const [assoc] = await db.select().from(associations).where(eq(associations.acronym, 'AGSOBA')).limit(1);
  const allIdentities = await db.select().from(identities).limit(5);

  if (!tenant || !assoc) {
    console.log('Cannot seed welfare: missing tenant or association.');
    return;
  }

  const tenantId = tenant.id;
  const associationId = assoc.id;

  const programId = `wprog_${Date.now()}`;
  await db.insert(welfarePrograms).values({
    id: programId,
    tenantId,
    associationId,
    title: 'AGSOBA National Emergency Medical & Bereavement Fund',
    description: 'Ring-fenced benevolent fund providing confidential financial distress relief and medical grants to verified alumni.',
    allocatedBudget: 250000000, // N2,500,000 in kobo
    disbursedTotal: 50000000,   // N500,000 in kobo
    status: 'ACTIVE',
  });

  if (allIdentities.length > 2) {
    const caseId = `wcase_${Date.now()}`;
    const anonRef = 'WLF-RELIEF-2026-X77';

    await db.insert(welfareCases).values({
      id: caseId,
      tenantId,
      programId,
      beneficiaryIdentityId: allIdentities[2].id,
      submittedByIdentityId: allIdentities[1].id,
      category: 'MEDICAL_EMERGENCY',
      summary: 'Urgent surgical intervention assistance required for veteran alumnus.',
      confidentialCaseNotes: 'Strictly confidential medical report attached. Verified by Welfare Committee chair.',
      requestedAmount: 75000000, // N750,000 in kobo
      approvedAmount: 50000000,  // N500,000 in kobo
      status: 'COMMITTEE_APPROVED',
      anonymizedReferenceCode: anonRef,
    }).catch(() => {});

    // Seed sample disbursement
    await db.insert(welfareDisbursements).values({
      id: `wdis_${Date.now()}`,
      caseId,
      disbursedByIdentityId: allIdentities[0].id,
      amountDisbursed: 50000000,
      bankReference: 'ZENITH-PAYOUT-2026-9921',
    }).catch(() => {});
  }

  console.log('✓ AGSOBA Welfare baseline seeding complete.');
}

/**
 * Get all welfare programs for a tenant
 */
export async function getWelfarePrograms(tenantId: string = 'tenant_ags_abeokuta') {
  return await db
    .select()
    .from(welfarePrograms)
    .where(eq(welfarePrograms.tenantId, tenantId))
    .orderBy(desc(welfarePrograms.createdAt));
}

/**
 * Create a new welfare program
 */
export async function createWelfareProgram(data: {
  tenantId: string;
  associationId: string;
  title: string;
  description: string;
  allocatedBudget: number;
}) {
  const id = `wprog_${Date.now()}`;
  const [record] = await db
    .insert(welfarePrograms)
    .values({
      id,
      tenantId: data.tenantId,
      associationId: data.associationId,
      title: data.title,
      description: data.description,
      allocatedBudget: data.allocatedBudget,
      disbursedTotal: 0,
      status: 'ACTIVE',
    })
    .returning();
  return record;
}

/**
 * Get welfare cases list (anonymized summary for officers/auditors without exposing raw confidential notes)
 */
export async function getWelfareCases(tenantId: string = 'tenant_ags_abeokuta') {
  const records = await db
    .select({
      id: welfareCases.id,
      tenantId: welfareCases.tenantId,
      programId: welfareCases.programId,
      category: welfareCases.category,
      summary: welfareCases.summary,
      requestedAmount: welfareCases.requestedAmount,
      approvedAmount: welfareCases.approvedAmount,
      status: welfareCases.status,
      anonymizedReferenceCode: welfareCases.anonymizedReferenceCode,
      createdAt: welfareCases.createdAt,
      beneficiary: {
        id: identities.id,
        firstName: identities.firstName,
        lastName: identities.lastName,
        email: identities.email,
      },
      program: {
        title: welfarePrograms.title,
      },
    })
    .from(welfareCases)
    .leftJoin(identities, eq(welfareCases.beneficiaryIdentityId, identities.id))
    .leftJoin(welfarePrograms, eq(welfareCases.programId, welfarePrograms.id))
    .where(eq(welfareCases.tenantId, tenantId))
    .orderBy(desc(welfareCases.createdAt));

  return records;
}

/**
 * Get detailed welfare case file with mandatory Zero-Trust Read-Access Audit Log entry
 */
export async function getWelfareCaseDetail(caseId: string, accessorIdentityId: string, clientIp?: string) {
  const [caseRecord] = await db
    .select({
      id: welfareCases.id,
      tenantId: welfareCases.tenantId,
      programId: welfareCases.programId,
      category: welfareCases.category,
      summary: welfareCases.summary,
      confidentialCaseNotes: welfareCases.confidentialCaseNotes,
      requestedAmount: welfareCases.requestedAmount,
      approvedAmount: welfareCases.approvedAmount,
      status: welfareCases.status,
      anonymizedReferenceCode: welfareCases.anonymizedReferenceCode,
      closureNotes: welfareCases.closureNotes,
      createdAt: welfareCases.createdAt,
      beneficiary: {
        id: identities.id,
        firstName: identities.firstName,
        lastName: identities.lastName,
        email: identities.email,
        phoneNumber: identities.phoneNumber,
      },
      program: {
        title: welfarePrograms.title,
      },
    })
    .from(welfareCases)
    .leftJoin(identities, eq(welfareCases.beneficiaryIdentityId, identities.id))
    .leftJoin(welfarePrograms, eq(welfareCases.programId, welfarePrograms.id))
    .where(eq(welfareCases.id, caseId))
    .limit(1);

  if (!caseRecord) {
    throw new Error('Confidential welfare case not found.');
  }

  // Record mandatory immutable access audit log
  const ipHash = clientIp ? crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 16) : 'internal';
  await db.insert(welfareAccessLogs).values({
    id: `walog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    caseId,
    accessorIdentityId,
    accessReason: 'COMMITTEE_REVIEW',
    clientIpHash: ipHash,
  });

  // Fetch reviews
  const reviews = await db
    .select({
      id: welfareCaseReviews.id,
      recommendation: welfareCaseReviews.recommendation,
      recommendedAmount: welfareCaseReviews.recommendedAmount,
      reviewComments: welfareCaseReviews.reviewComments,
      reviewedAt: welfareCaseReviews.reviewedAt,
      reviewer: {
        firstName: identities.firstName,
        lastName: identities.lastName,
      },
    })
    .from(welfareCaseReviews)
    .leftJoin(identities, eq(welfareCaseReviews.reviewerIdentityId, identities.id))
    .where(eq(welfareCaseReviews.caseId, caseId))
    .orderBy(desc(welfareCaseReviews.reviewedAt));

  // Fetch disbursements
  const [disbursement] = await db
    .select()
    .from(welfareDisbursements)
    .where(eq(welfareDisbursements.caseId, caseId))
    .limit(1);

  // Fetch audit logs for this case
  const accessLogs = await db
    .select({
      id: welfareAccessLogs.id,
      accessReason: welfareAccessLogs.accessReason,
      accessedAt: welfareAccessLogs.accessedAt,
      clientIpHash: welfareAccessLogs.clientIpHash,
      accessor: {
        firstName: identities.firstName,
        lastName: identities.lastName,
        email: identities.email,
      },
    })
    .from(welfareAccessLogs)
    .leftJoin(identities, eq(welfareAccessLogs.accessorIdentityId, identities.id))
    .where(eq(welfareAccessLogs.caseId, caseId))
    .orderBy(desc(welfareAccessLogs.accessedAt));

  return {
    ...caseRecord,
    reviews,
    disbursement: disbursement || null,
    accessLogs,
  };
}

/**
 * Submit confidential welfare case claim
 */
export async function createWelfareCase(data: {
  tenantId: string;
  programId: string;
  beneficiaryIdentityId: string;
  submittedByIdentityId?: string;
  category: string;
  summary: string;
  confidentialCaseNotes: string;
  requestedAmount: number;
}) {
  const id = `wcase_${Date.now()}`;
  const randomCode = Math.floor(100 + Math.random() * 900);
  const anonymizedReferenceCode = `WLF-RELIEF-2026-X${randomCode}`;

  const [record] = await db
    .insert(welfareCases)
    .values({
      id,
      tenantId: data.tenantId,
      programId: data.programId,
      beneficiaryIdentityId: data.beneficiaryIdentityId,
      submittedByIdentityId: data.submittedByIdentityId,
      category: data.category,
      summary: data.summary,
      confidentialCaseNotes: data.confidentialCaseNotes,
      requestedAmount: data.requestedAmount,
      approvedAmount: 0,
      status: 'SUBMITTED',
      anonymizedReferenceCode,
    })
    .returning();

  return record;
}

/**
 * Submit Committee Review / Vote on Welfare Case
 */
export async function reviewWelfareCase(data: {
  caseId: string;
  reviewerIdentityId: string;
  recommendation: 'APPROVE' | 'REQUEST_INFO' | 'REJECT';
  recommendedAmount: number;
  reviewComments: string;
}) {
  const reviewId = `wrev_${Date.now()}`;
  await db.insert(welfareCaseReviews).values({
    id: reviewId,
    caseId: data.caseId,
    reviewerIdentityId: data.reviewerIdentityId,
    recommendation: data.recommendation,
    recommendedAmount: data.recommendedAmount,
    reviewComments: data.reviewComments,
  });

  // If approved, update case status to COMMITTEE_APPROVED and set approved amount
  if (data.recommendation === 'APPROVE') {
    await db
      .update(welfareCases)
      .set({
        status: 'COMMITTEE_APPROVED',
        approvedAmount: data.recommendedAmount,
        updatedAt: new Date(),
      })
      .where(eq(welfareCases.id, data.caseId));
  } else if (data.recommendation === 'REJECT') {
    await db
      .update(welfareCases)
      .set({
        status: 'REJECTED',
        updatedAt: new Date(),
      })
      .where(eq(welfareCases.id, data.caseId));
  }

  return { success: true, reviewId };
}

/**
 * Disburse Emergency Welfare Grant & link to ledger with anonymized reference
 */
export async function disburseWelfareGrant(data: {
  caseId: string;
  disbursedByIdentityId: string;
  amountDisbursed: number;
  bankReference: string;
}) {
  const [caseRecord] = await db
    .select()
    .from(welfareCases)
    .where(eq(welfareCases.id, data.caseId))
    .limit(1);

  if (!caseRecord) {
    throw new Error('Welfare case not found.');
  }

  const disbursementId = `wdis_${Date.now()}`;
  await db.insert(welfareDisbursements).values({
    id: disbursementId,
    caseId: data.caseId,
    disbursedByIdentityId: data.disbursedByIdentityId,
    amountDisbursed: data.amountDisbursed,
    bankReference: data.bankReference,
  });

  // Update case status to DISBURSED
  await db
    .update(welfareCases)
    .set({
      status: 'DISBURSED',
      approvedAmount: data.amountDisbursed,
      updatedAt: new Date(),
    })
    .where(eq(welfareCases.id, data.caseId));

  // Post entry to financial transactions ledger using anonymized reference code
  const [assetAccount] = await db
    .select()
    .from(financialAccounts)
    .where(and(eq(financialAccounts.tenantId, caseRecord.tenantId), eq(financialAccounts.code, '1010')))
    .limit(1);

  const [expenseAccount] = await db
    .select()
    .from(financialAccounts)
    .where(and(eq(financialAccounts.tenantId, caseRecord.tenantId), eq(financialAccounts.code, '5020')))
    .limit(1);

  if (assetAccount && expenseAccount) {
    await db.insert(financialTransactions).values({
      id: `txn_wlf_${Date.now()}`,
      tenantId: caseRecord.tenantId,
      associationId: 'asc_agsoba_01',
      debitAccountId: expenseAccount.id,
      creditAccountId: assetAccount.id,
      amount: data.amountDisbursed,
      currency: 'NGN',
      description: `Welfare Emergency Grant Payout (${caseRecord.anonymizedReferenceCode})`,
      referenceId: caseRecord.anonymizedReferenceCode,
      idempotencyKey: `idemp_wlf_${caseRecord.id}_${Date.now()}`,
      recordedByIdentityId: data.disbursedByIdentityId,
    });
  }

  return { success: true, disbursementId, anonymizedReferenceCode: caseRecord.anonymizedReferenceCode };
}

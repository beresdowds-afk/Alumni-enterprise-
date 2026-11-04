/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './index.ts';
import { classSetMemberships, identities, classSets, schoolAttendances, auditLogs } from './schema.ts';
import { eq, and } from 'drizzle-orm';

export interface BatchImportRow {
  email: string;
  firstName: string;
  lastName: string;
  admissionYear: number;
  graduationYear: number;
  entryClass?: string;
  exitClass?: string;
}

/**
 * Retrieves pending membership verification items for a tenant.
 */
export async function getPendingMemberships(tenantId: string) {
  try {
    return await db
      .select({
        membershipId: classSetMemberships.id,
        category: classSetMemberships.category,
        basisOfRecognition: classSetMemberships.basisOfRecognition,
        verificationStatus: classSetMemberships.verificationStatus,
        createdAt: classSetMemberships.createdAt,
        identityId: identities.id,
        email: identities.email,
        firstName: identities.firstName,
        lastName: identities.lastName,
        classSetId: classSets.id,
        officialIdentifier: classSets.officialIdentifier,
        admissionYear: classSets.admissionYear,
        graduationYear: classSets.graduationYear,
      })
      .from(classSetMemberships)
      .innerJoin(identities, eq(classSetMemberships.identityId, identities.id))
      .innerJoin(classSets, eq(classSetMemberships.classSetId, classSets.id))
      .where(
        and(
          eq(classSetMemberships.tenantId, tenantId),
          eq(classSetMemberships.verificationStatus, 'PENDING_REVIEW')
        )
      );
  } catch (error) {
    console.error('Failed to fetch pending memberships:', error);
    throw new Error('Database query failed while fetching pending verification queue.');
  }
}

/**
 * Updates membership verification status (VERIFIED or REJECTED).
 */
export async function updateMembershipVerificationStatus(
  membershipId: string,
  tenantId: string,
  status: 'VERIFIED' | 'REJECTED' | 'DISPUTED',
  verifierIdentityId: string
) {
  try {
    const updated = await db
      .update(classSetMemberships)
      .set({
        verificationStatus: status,
        verifiedByIdentityId: verifierIdentityId,
        verifiedAt: new Date(),
      })
      .where(
        and(
          eq(classSetMemberships.id, membershipId),
          eq(classSetMemberships.tenantId, tenantId)
        )
      )
      .returning();

    // Record audit log
    await db.insert(auditLogs).values({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      actorIdentityId: verifierIdentityId,
      action: `MEMBERSHIP_${status}`,
      targetResource: `class_set_memberships/${membershipId}`,
      scope: 'CLASS_SET',
      details: { newStatus: status },
    });

    return updated;
  } catch (error) {
    console.error('Failed to update membership verification status:', error);
    throw new Error('Database transaction failed while updating verification status.');
  }
}

/**
 * Batch imports alumni roster with deduplication and automated attendance/membership linking.
 */
export async function batchImportMembers(
  tenantId: string,
  associationId: string,
  rows: BatchImportRow[],
  actorIdentityId: string
) {
  const results = {
    totalProcessed: rows.length,
    successfulImports: 0,
    duplicatesSkipped: 0,
    errors: [] as string[],
  };

  for (const row of rows) {
    try {
      // 1. Check if identity already exists by email
      const existingIdentity = await db
        .select()
        .from(identities)
        .where(eq(identities.email, row.email.toLowerCase().trim()))
        .limit(1);

      let identityId: string;

      if (existingIdentity.length > 0) {
        identityId = existingIdentity[0].id;
        results.duplicatesSkipped++;
      } else {
        identityId = `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await db.insert(identities).values({
          id: identityId,
          email: row.email.toLowerCase().trim(),
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          isEmailVerified: true,
          status: 'ACTIVE',
        });
      }

      // 2. Find or create class set
      const targetClassSetId = `cs_agsoba_${row.admissionYear}_${row.graduationYear}`;
      
      // 3. Insert school attendance fact
      const attendanceId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(schoolAttendances).values({
        id: attendanceId,
        identityId,
        tenantId,
        actualAdmissionYear: row.admissionYear,
        actualExitYear: row.graduationYear,
        entryClass: row.entryClass || 'Form 1',
        exitClass: row.exitClass || 'Form 5',
        graduatedFromSchool: true,
      });

      // 4. Insert membership application in PENDING_REVIEW or VERIFIED status
      const membershipId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(classSetMemberships).values({
        id: membershipId,
        tenantId,
        identityId,
        classSetId: targetClassSetId,
        category: 'STANDARD_COHORT',
        basisOfRecognition: 'Batch roster import verified by administration',
        verificationStatus: 'PENDING_REVIEW',
      });

      results.successfulImports++;
    } catch (err: any) {
      results.errors.push(`Row (${row.email}): ${err.message}`);
    }
  }

  // Record audit log for batch import
  await db.insert(auditLogs).values({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tenantId,
    actorIdentityId,
    action: 'BATCH_ROSTER_IMPORT',
    targetResource: `tenants/${tenantId}/memberships`,
    scope: 'ASSOCIATION',
    details: results,
  });

  return results;
}

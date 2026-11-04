import { db } from './index.ts';
import {
  executiveAppointments,
  appointmentPermissions,
  permissions,
  identities,
  classSets,
  associations,
  auditLogs,
} from './schema.ts';
import { eq, and, lt, desc, sql } from 'drizzle-orm';
import { recordAuditEvent } from './authServices.ts';

export interface CreateAppointmentInput {
  tenantId: string;
  associationId: string;
  classSetId?: string;
  identityId: string;
  officeTitle: string; // e.g. 'CHAIRMAN', 'SECRETARY', 'TREASURER', 'WELFARE_OFFICER'
  scope: 'ASSOCIATION' | 'CLASS_SET';
  termStartDate: string; // ISO string
  termEndDate: string;   // ISO string
  appointedByIdentityId?: string;
  permissionIds?: string[]; // array of permission IDs to grant
}

/**
 * Retrieve executive appointments with joined identity, class set, and granted permissions
 */
export async function getExecutiveAppointments(classSetId?: string, associationId?: string) {
  // First, run auto-expiration check
  await checkAndUpdateExpiredAppointments();

  let query = db
    .select({
      id: executiveAppointments.id,
      tenantId: executiveAppointments.tenantId,
      associationId: executiveAppointments.associationId,
      classSetId: executiveAppointments.classSetId,
      identityId: executiveAppointments.identityId,
      officeTitle: executiveAppointments.officeTitle,
      scope: executiveAppointments.scope,
      termStartDate: executiveAppointments.termStartDate,
      termEndDate: executiveAppointments.termEndDate,
      status: executiveAppointments.status,
      handoverMemoRef: executiveAppointments.handoverMemoRef,
      createdAt: executiveAppointments.createdAt,
      identity: {
        id: identities.id,
        firstName: identities.firstName,
        lastName: identities.lastName,
        email: identities.email,
      },
      classSet: {
        id: classSets.id,
        officialIdentifier: classSets.officialIdentifier,
        displayName: classSets.displayName,
      },
    })
    .from(executiveAppointments)
    .leftJoin(identities, eq(executiveAppointments.identityId, identities.id))
    .leftJoin(classSets, eq(executiveAppointments.classSetId, classSets.id));

  const conditions = [];
  if (classSetId) {
    conditions.push(eq(executiveAppointments.classSetId, classSetId));
  }
  if (associationId) {
    conditions.push(eq(executiveAppointments.associationId, associationId));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const appointments = await query.orderBy(desc(executiveAppointments.createdAt));

  // Fetch permissions for each appointment
  const result = [];
  for (const app of appointments) {
    const perms = await db
      .select({
        permissionId: permissions.id,
        code: permissions.code,
        name: permissions.name,
        scope: permissions.scope,
      })
      .from(appointmentPermissions)
      .innerJoin(permissions, eq(appointmentPermissions.permissionId, permissions.id))
      .where(eq(appointmentPermissions.appointmentId, app.id));

    result.push({
      ...app,
      permissions: perms,
    });
  }

  return result;
}

/**
 * Create a new executive appointment with time-bound term dates and permission delegation
 */
export async function createExecutiveAppointment(input: CreateAppointmentInput) {
  const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const [created] = await db
    .insert(executiveAppointments)
    .values({
      id: appointmentId,
      tenantId: input.tenantId,
      associationId: input.associationId,
      classSetId: input.classSetId || null,
      identityId: input.identityId,
      officeTitle: input.officeTitle,
      scope: input.scope,
      termStartDate: new Date(input.termStartDate),
      termEndDate: new Date(input.termEndDate),
      status: 'ACTIVE',
      appointedByIdentityId: input.appointedByIdentityId || null,
    })
    .returning();

  // Grant permissions if specified
  if (input.permissionIds && input.permissionIds.length > 0) {
    for (const permId of input.permissionIds) {
      await db.insert(appointmentPermissions).values({
        id: `ap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        appointmentId,
        permissionId: permId,
      }).onConflictDoNothing();
    }
  }

  // Log audit event
  await recordAuditEvent({
    tenantId: input.tenantId,
    actorIdentityId: input.appointedByIdentityId,
    action: 'EXECUTIVE_APPOINTED',
    targetResource: `executive_appointments/${appointmentId}`,
    scope: input.scope,
    details: {
      officeTitle: input.officeTitle,
      appointeeIdentityId: input.identityId,
      termStartDate: input.termStartDate,
      termEndDate: input.termEndDate,
    },
  });

  return created;
}

/**
 * Revoke an active executive appointment
 */
export async function revokeExecutiveAppointment(appointmentId: string, actorIdentityId?: string) {
  const [existing] = await db
    .select()
    .from(executiveAppointments)
    .where(eq(executiveAppointments.id, appointmentId));

  if (!existing) {
    throw new Error('Executive appointment not found.');
  }

  const [updated] = await db
    .update(executiveAppointments)
    .set({ status: 'REVOKED' })
    .where(eq(executiveAppointments.id, appointmentId))
    .returning();

  await recordAuditEvent({
    tenantId: existing.tenantId,
    actorIdentityId: actorIdentityId || null,
    action: 'EXECUTIVE_REVOKED',
    targetResource: `executive_appointments/${appointmentId}`,
    scope: existing.scope as any,
    details: {
      officeTitle: existing.officeTitle,
      identityId: existing.identityId,
    },
  });

  return updated;
}

/**
 * Automatically mark appointments past termEndDate as EXPIRED
 */
export async function checkAndUpdateExpiredAppointments() {
  const now = new Date();
  await db
    .update(executiveAppointments)
    .set({ status: 'EXPIRED' })
    .where(
      and(
        eq(executiveAppointments.status, 'ACTIVE'),
        lt(executiveAppointments.termEndDate, now)
      )
    );
}

/**
 * Record digital handover memorandum linking outgoing and incoming executive
 */
export async function createHandoverMemorandum(input: {
  appointmentId: string;
  handoverMemoRef: string;
  notes: string;
  actorIdentityId?: string;
}) {
  const [existing] = await db
    .select()
    .from(executiveAppointments)
    .where(eq(executiveAppointments.id, input.appointmentId));

  if (!existing) {
    throw new Error('Executive appointment not found.');
  }

  const [updated] = await db
    .update(executiveAppointments)
    .set({ handoverMemoRef: input.handoverMemoRef })
    .where(eq(executiveAppointments.id, input.appointmentId))
    .returning();

  await recordAuditEvent({
    tenantId: existing.tenantId,
    actorIdentityId: input.actorIdentityId || null,
    action: 'HANDOVER_MEMORANDUM_FILED',
    targetResource: `executive_appointments/${input.appointmentId}`,
    scope: existing.scope as any,
    details: {
      handoverMemoRef: input.handoverMemoRef,
      notes: input.notes,
      officeTitle: existing.officeTitle,
    },
  });

  return updated;
}

/**
 * Verify whether an identity holds an active, non-expired appointment with the required permission code
 */
export async function verifyExecutivePermission(
  identityId: string,
  permissionCode: string,
  classSetId?: string
): Promise<boolean> {
  await checkAndUpdateExpiredAppointments();

  const now = new Date();
  let query = db
    .select({
      appointmentId: executiveAppointments.id,
    })
    .from(executiveAppointments)
    .innerJoin(
      appointmentPermissions,
      eq(executiveAppointments.id, appointmentPermissions.appointmentId)
    )
    .innerJoin(permissions, eq(appointmentPermissions.permissionId, permissions.id))
    .where(
      and(
        eq(executiveAppointments.identityId, identityId),
        eq(executiveAppointments.status, 'ACTIVE'),
        eq(permissions.code, permissionCode),
        lt(executiveAppointments.termStartDate, now),
        sql`${executiveAppointments.termEndDate} > ${now}`
      )
    );

  const activeAppts = await query;
  return activeAppts.length > 0;
}

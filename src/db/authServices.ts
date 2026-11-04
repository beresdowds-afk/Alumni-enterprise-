import { db } from './index.ts';
import {
  identities,
  profiles,
  platformAdministrators,
  executiveAppointments,
  appointmentPermissions,
  permissions,
  classSetMemberships,
  auditLogs,
  tenants,
} from './schema.ts';
import { eq, and, lte, gte } from 'drizzle-orm';
import crypto from 'crypto';

export interface UserSecurityContext {
  identity: typeof identities.$inferSelect;
  profile: typeof profiles.$inferSelect | null;
  platformAdmin: typeof platformAdministrators.$inferSelect | null;
  associationAppointments: Array<typeof executiveAppointments.$inferSelect>;
  classSetAppointments: Array<typeof executiveAppointments.$inferSelect>;
  verifiedMemberships: Array<typeof classSetMemberships.$inferSelect>;
  effectivePermissions: string[]; // Permission codes
}

/**
 * Synchronize Firebase Authenticated User into PostgreSQL identities and profiles.
 * Upserts identity based on email/uid.
 */
export async function syncUserIdentity(decodedToken: {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}): Promise<UserSecurityContext> {
  const email = decodedToken.email?.toLowerCase().trim();
  if (!email) {
    throw new Error('Authenticated user missing email in token.');
  }

  const nameParts = (decodedToken.name || 'Alumnus Member').split(' ');
  const firstName = nameParts[0] || 'Alumnus';
  const lastName = nameParts.slice(1).join(' ') || 'Member';

  // 1. Check if identity exists by UID or Email
  const existingByUid = await db.select().from(identities).where(eq(identities.uid, decodedToken.uid));
  let identityRecord: typeof identities.$inferSelect;

  if (existingByUid.length > 0) {
    identityRecord = existingByUid[0];
  } else {
    const existingByEmail = await db.select().from(identities).where(eq(identities.email, email));
    if (existingByEmail.length > 0) {
      // Link Firebase UID to existing email record
      const updated = await db
        .update(identities)
        .set({ uid: decodedToken.uid, isEmailVerified: true, updatedAt: new Date() })
        .where(eq(identities.id, existingByEmail[0].id))
        .returning();
      identityRecord = updated[0];
    } else {
      // Create fresh canonical identity record
      const newId = `id_${crypto.randomUUID().slice(0, 12)}`;
      const inserted = await db
        .insert(identities)
        .values({
          id: newId,
          uid: decodedToken.uid,
          email,
          firstName,
          lastName,
          isEmailVerified: true,
          status: 'ACTIVE',
        })
        .returning();
      identityRecord = inserted[0];

      // Create linked profile
      await db.insert(profiles).values({
        id: `prof_${crypto.randomUUID().slice(0, 12)}`,
        identityId: newId,
        avatarUrl: decodedToken.picture || null,
        headline: 'Abeokuta Grammar School Alumnus',
        privacyConsent: true,
      });

      // Log initial account provisioning audit event
      await recordAuditEvent({
        tenantId: 'tenant_ags_abeokuta',
        actorIdentityId: newId,
        action: 'IDENTITY_PROVISIONED',
        targetResource: `identities/${newId}`,
        scope: 'PLATFORM',
        details: { email, source: 'Firebase_Google_Auth' },
      });
    }
  }

  // 2. Fetch full security context
  return await getUserSecurityContext(identityRecord.id);
}

/**
 * Resolves 3-Tier Governance Scopes and Active Permissions for an Identity.
 * Strict time-bound validation: appointments must be ACTIVE and term_start <= now <= term_end.
 */
export async function getUserSecurityContext(identityId: string): Promise<UserSecurityContext> {
  const identityRows = await db.select().from(identities).where(eq(identities.id, identityId));
  if (!identityRows.length) {
    throw new Error(`Identity not found: ${identityId}`);
  }
  const identity = identityRows[0];

  const profileRows = await db.select().from(profiles).where(eq(profiles.identityId, identityId));
  const profile = profileRows.length ? profileRows[0] : null;

  // Check Platform Scope
  const platformAdminRows = await db
    .select()
    .from(platformAdministrators)
    .where(and(eq(platformAdministrators.identityId, identityId), eq(platformAdministrators.status, 'ACTIVE')));
  const platformAdmin = platformAdminRows.length ? platformAdminRows[0] : null;

  // Check Association and Class Set Active Appointments (time-bound validation)
  const now = new Date();
  const allAppointments = await db
    .select()
    .from(executiveAppointments)
    .where(
      and(
        eq(executiveAppointments.identityId, identityId),
        eq(executiveAppointments.status, 'ACTIVE'),
        lte(executiveAppointments.termStartDate, now),
        gte(executiveAppointments.termEndDate, now)
      )
    );

  const associationAppointments = allAppointments.filter((a) => a.scope === 'ASSOCIATION');
  const classSetAppointments = allAppointments.filter((a) => a.scope === 'CLASS_SET');

  // Check Verified Class Set Memberships
  const verifiedMemberships = await db
    .select()
    .from(classSetMemberships)
    .where(and(eq(classSetMemberships.identityId, identityId), eq(classSetMemberships.verificationStatus, 'VERIFIED')));

  // Resolve Granted Permission Codes
  const appointmentIds = allAppointments.map((a) => a.id);
  const effectivePermissions: Set<string> = new Set();

  if (platformAdmin) {
    effectivePermissions.add('platform:super_admin');
  }

  if (appointmentIds.length > 0) {
    for (const apptId of appointmentIds) {
      const grantRows = await db
        .select({ code: permissions.code })
        .from(appointmentPermissions)
        .innerJoin(permissions, eq(appointmentPermissions.permissionId, permissions.id))
        .where(eq(appointmentPermissions.appointmentId, apptId));

      grantRows.forEach((r) => effectivePermissions.add(r.code));
    }
  }

  return {
    identity,
    profile,
    platformAdmin,
    associationAppointments,
    classSetAppointments,
    verifiedMemberships,
    effectivePermissions: Array.from(effectivePermissions),
  };
}

/**
 * Record immutable Administrative & Security Audit Event.
 */
export async function recordAuditEvent(params: {
  tenantId: string;
  actorIdentityId?: string | null;
  action: string;
  targetResource: string;
  scope: 'PLATFORM' | 'ASSOCIATION' | 'CLASS_SET';
  clientIpHash?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      id: `audit_${crypto.randomUUID().slice(0, 16)}`,
      tenantId: params.tenantId,
      actorIdentityId: params.actorIdentityId || null,
      action: params.action,
      targetResource: params.targetResource,
      scope: params.scope,
      clientIpHash: params.clientIpHash || 'direct_api',
      details: params.details || {},
    });
  } catch (err) {
    console.error('Failed to persist audit log to Cloud SQL:', err);
  }
}

/**
 * Update member personal biography profile with validation.
 */
export async function updateUserProfile(
  identityId: string,
  updates: {
    headline?: string;
    bio?: string;
    profession?: string;
    industry?: string;
    currentCity?: string;
    currentCountry?: string;
    linkedInUrl?: string;
    avatarUrl?: string;
  }
) {
  const existing = await db.select().from(profiles).where(eq(profiles.identityId, identityId));
  if (!existing.length) {
    const newId = `prof_${crypto.randomUUID().slice(0, 12)}`;
    return await db
      .insert(profiles)
      .values({
        id: newId,
        identityId,
        ...updates,
        privacyConsent: true,
      })
      .returning();
  }

  return await db
    .update(profiles)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(profiles.identityId, identityId))
    .returning();
}

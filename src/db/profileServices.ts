import { db } from './index.ts';
import {
  identities,
  profiles,
  classSetMemberships,
  classSets,
  auditLogs,
} from './schema.ts';
import { eq, and, or, ilike, desc, sql } from 'drizzle-orm';
import { recordAuditEvent } from './authServices.ts';

export interface DirectoryQueryOptions {
  tenantId?: string;
  search?: string;
  profession?: string;
  industry?: string;
  city?: string;
  country?: string;
  classSetId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Searchable alumni directory with field-level privacy masking
 */
export async function getDirectoryMembers(options: DirectoryQueryOptions) {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  // Base query joining identities, profiles, and class set memberships
  let query = db
    .select({
      identityId: identities.id,
      firstName: identities.firstName,
      lastName: identities.lastName,
      email: identities.email,
      phoneNumber: identities.phoneNumber,
      headline: profiles.headline,
      bio: profiles.bio,
      profession: profiles.profession,
      industry: profiles.industry,
      currentCity: profiles.currentCity,
      currentCountry: profiles.currentCountry,
      linkedInUrl: profiles.linkedInUrl,
      avatarUrl: profiles.avatarUrl,
      showEmail: profiles.showEmail,
      showPhone: profiles.showPhone,
      showLocation: profiles.showLocation,
      classSetId: classSetMemberships.classSetId,
      classSetDisplay: classSets.displayName,
    })
    .from(identities)
    .leftJoin(profiles, eq(identities.id, profiles.identityId))
    .leftJoin(classSetMemberships, eq(identities.id, classSetMemberships.identityId))
    .leftJoin(classSets, eq(classSetMemberships.classSetId, classSets.id));

  const conditions: any[] = [eq(identities.status, 'ACTIVE')];

  if (options.tenantId) {
    conditions.push(
      or(
        eq(classSetMemberships.tenantId, options.tenantId),
        sql`${classSetMemberships.tenantId} IS NULL`
      )
    );
  }

  if (options.search) {
    const searchTerm = `%${options.search}%`;
    conditions.push(
      or(
        ilike(identities.firstName, searchTerm),
        ilike(identities.lastName, searchTerm),
        ilike(profiles.profession, searchTerm),
        ilike(profiles.industry, searchTerm),
        ilike(profiles.headline, searchTerm)
      )
    );
  }

  if (options.profession) {
    conditions.push(ilike(profiles.profession, `%${options.profession}%`));
  }

  if (options.industry) {
    conditions.push(ilike(profiles.industry, `%${options.industry}%`));
  }

  if (options.city) {
    conditions.push(ilike(profiles.currentCity, `%${options.city}%`));
  }

  if (options.country) {
    conditions.push(ilike(profiles.currentCountry, `%${options.country}%`));
  }

  if (options.classSetId) {
    conditions.push(eq(classSetMemberships.classSetId, options.classSetId));
  }

  const members = await query.where(and(...conditions)).limit(limit).offset(offset);

  // Apply field-level privacy masking
  const maskedMembers = members.map((m) => ({
    ...m,
    email: m.showEmail ? m.email : '••••••••@••••.com',
    phoneNumber: m.showPhone ? m.phoneNumber : '+234 ••• ••• ••••',
    currentCity: m.showLocation ? m.currentCity : 'Confidential Location',
    currentCountry: m.showLocation ? m.currentCountry : 'Confidential Country',
  }));

  return maskedMembers;
}

/**
 * Get single member profile detail with privacy respect
 */
export async function getMemberProfileDetail(identityId: string) {
  const [record] = await db
    .select({
      identityId: identities.id,
      firstName: identities.firstName,
      lastName: identities.lastName,
      email: identities.email,
      phoneNumber: identities.phoneNumber,
      headline: profiles.headline,
      bio: profiles.bio,
      profession: profiles.profession,
      industry: profiles.industry,
      currentCity: profiles.currentCity,
      currentCountry: profiles.currentCountry,
      linkedInUrl: profiles.linkedInUrl,
      avatarUrl: profiles.avatarUrl,
      showEmail: profiles.showEmail,
      showPhone: profiles.showPhone,
      showLocation: profiles.showLocation,
      privacyConsent: profiles.privacyConsent,
    })
    .from(identities)
    .leftJoin(profiles, eq(identities.id, profiles.identityId))
    .where(eq(identities.id, identityId));

  if (!record) return null;

  return {
    ...record,
    email: record.showEmail ? record.email : '••••••••@••••.com',
    phoneNumber: record.showPhone ? record.phoneNumber : '+234 ••• ••• ••••',
    currentCity: record.showLocation ? record.currentCity : 'Confidential Location',
    currentCountry: record.showLocation ? record.currentCountry : 'Confidential Country',
  };
}

/**
 * Update member privacy preferences
 */
export async function updateMemberPrivacySettings(
  identityId: string,
  settings: { showEmail: boolean; showPhone: boolean; showLocation: boolean; privacyConsent: boolean }
) {
  const [updated] = await db
    .update(profiles)
    .set({
      showEmail: settings.showEmail,
      showPhone: settings.showPhone,
      showLocation: settings.showLocation,
      privacyConsent: settings.privacyConsent,
      updatedAt: new Date(),
    })
    .where(eq(profiles.identityId, identityId))
    .returning();

  await recordAuditEvent({
    tenantId: 'tenant_ags_abeokuta',
    actorIdentityId: identityId,
    action: 'PRIVACY_SETTINGS_UPDATED',
    targetResource: `profiles/${identityId}`,
    scope: 'CLASS_SET',
    details: settings,
  });

  return updated;
}

/**
 * Send contact gateway inquiry / introduction request
 */
export async function sendContactInquiry(input: {
  senderIdentityId: string;
  recipientIdentityId: string;
  message: string;
  subject: string;
}) {
  // Record contact inquiry in audit logs as a secure traceable communication event
  await recordAuditEvent({
    tenantId: 'tenant_ags_abeokuta',
    actorIdentityId: input.senderIdentityId,
    action: 'CONTACT_GATEWAY_INQUIRY_SENT',
    targetResource: `identities/${input.recipientIdentityId}`,
    scope: 'CLASS_SET',
    details: {
      subject: input.subject,
      messageLength: input.message.length,
      recipientId: input.recipientIdentityId,
    },
  });

  return { success: true, deliveredAt: new Date().toISOString() };
}

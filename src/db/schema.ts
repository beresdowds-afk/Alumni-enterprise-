import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * 1. TENANTS (Root School Entity)
 * Represents the educational institution boundary (e.g. Abeokuta Grammar School).
 */
export const tenants = pgTable(
  'tenants',
  {
    id: text('id').primaryKey(), // e.g. 'tenant_ags_abeokuta'
    name: text('name').notNull(), // 'Abeokuta Grammar School'
    code: text('code').notNull().unique(), // 'ags'
    country: text('country').notNull().default('Nigeria'),
    state: text('state').default('Ogun State'),
    city: text('city').default('Abeokuta'),
    defaultCurrency: text('default_currency').notNull().default('NGN'),
    defaultTimezone: text('default_timezone').notNull().default('Africa/Lagos'),
    brandingConfig: jsonb('branding_config').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('tenants_code_idx').on(table.code),
  ]
);

/**
 * 2. ASSOCIATIONS (Alumni Association)
 * Bound to a tenant school. AGSOBA is the initial configured tenant association.
 */
export const associations = pgTable(
  'associations',
  {
    id: text('id').primaryKey(), // e.g. 'asc_agsoba_01'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // 'Abeokuta Grammar School Old Boys Association'
    acronym: text('acronym').notNull(), // 'AGSOBA'
    classSetFormula: text('class_set_formula').notNull().default('{acronym} {yy_adm}{zz_grad}'),
    constitutionVersion: text('constitution_version').notNull().default('2024.1-REV'),
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'SUSPENDED'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('associations_tenant_acronym_idx').on(table.tenantId, table.acronym),
  ]
);

/**
 * 3. IDENTITIES (Canonical Person Record)
 * Decoupled from class set membership and school attendance.
 * 1 physical human = 1 canonical identity across the enterprise platform.
 */
export const identities = pgTable(
  'identities',
  {
    id: text('id').primaryKey(), // e.g. 'id_user_001'
    uid: text('uid').unique(), // Firebase Auth UID
    email: text('email').notNull().unique(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    middleName: text('middle_name'),
    phoneNumber: text('phone_number'),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'SUSPENDED'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('identities_email_idx').on(table.email),
    uniqueIndex('identities_uid_idx').on(table.uid),
  ]
);

/**
 * 4. PROFILES (Personal and Professional Biography)
 */
export const profiles = pgTable(
  'profiles',
  {
    id: text('id').primaryKey(),
    identityId: text('identity_id')
      .notNull()
      .unique()
      .references(() => identities.id, { onDelete: 'cascade' }),
    headline: text('headline'),
    bio: text('bio'),
    profession: text('profession'),
    industry: text('industry'),
    currentCity: text('current_city'),
    currentCountry: text('current_country'),
    linkedInUrl: text('linkedin_url'),
    privacyConsent: boolean('privacy_consent').notNull().default(false),
    showEmail: boolean('show_email').notNull().default(false),
    showPhone: boolean('show_phone').notNull().default(false),
    showLocation: boolean('show_location').notNull().default(true),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('profiles_identity_id_idx').on(table.identityId),
  ]
);

/**
 * 5. SCHOOL ATTENDANCES (Factual Historical Attendance)
 * Immutable historical truth. Never fabricated or mutated for class set placement.
 */
export const schoolAttendances = pgTable(
  'school_attendances',
  {
    id: text('id').primaryKey(),
    identityId: text('identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    actualAdmissionYear: integer('actual_admission_year').notNull(), // Authoritative 4 digits
    actualExitYear: integer('actual_exit_year').notNull(),           // Authoritative 4 digits
    entryClass: text('entry_class').notNull().default('Form 1'),
    exitClass: text('exit_class').notNull().default('Form 5'),
    graduatedFromSchool: boolean('graduated_from_school').notNull().default(true),
    departureReason: text('departure_reason'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('attendances_identity_tenant_idx').on(table.identityId, table.tenantId),
  ]
);

/**
 * 6. CLASS SETS (Canonical Class Set)
 * Anchor: combination of admission year (4 digits) and graduation year (4 digits).
 * Unique across tenant, association, admission year, and graduation year.
 */
export const classSets = pgTable(
  'class_sets',
  {
    id: text('id').primaryKey(), // e.g. 'cs_agsoba_1983_1988'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    associationId: text('association_id')
      .notNull()
      .references(() => associations.id, { onDelete: 'cascade' }),
    admissionYear: integer('admission_year').notNull(),   // Full 4-digit (e.g. 1983)
    graduationYear: integer('graduation_year').notNull(), // Full 4-digit (e.g. 1988)
    officialIdentifier: text('official_identifier').notNull(), // 'AGSOBA 8388'
    displayName: text('display_name').notNull(), // 'AGSOBA 8388' or 'AGSOBA 8388 (1883–1888)'
    hasCenturyCollision: boolean('has_century_collision').notNull().default(false),
    description: text('description'),
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'DORMANT', 'PROVISIONAL'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // CRITICAL: Guarantees full-year uniqueness and century collision prevention
    uniqueIndex('class_sets_tenant_assoc_years_idx').on(
      table.tenantId,
      table.associationId,
      table.admissionYear,
      table.graduationYear
    ),
  ]
);

/**
 * 7. CLASS SET MEMBERSHIPS (Association Recognition)
 * Connects an Identity to a Class Set under an approved membership category.
 */
export const classSetMemberships = pgTable(
  'class_set_memberships',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    identityId: text('identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    classSetId: text('class_set_id')
      .notNull()
      .references(() => classSets.id, { onDelete: 'cascade' }),
    category: text('category').notNull().default('STANDARD_COHORT'),
    // 'STANDARD_COHORT', 'MIDWAY_LEAVER_RECOGNISED', 'TRANSFER_ENTRANT_RECOGNISED', 'SPECIALLY_RECOGNISED', 'PENDING_CLASSIFICATION', 'DISPUTED_CLASSIFICATION'
    basisOfRecognition: text('basis_of_recognition').notNull(),
    verificationStatus: text('verification_status').notNull().default('PENDING_REVIEW'),
    // 'VERIFIED', 'PENDING_REVIEW', 'REJECTED', 'DISPUTED'
    verifiedByIdentityId: text('verified_by_identity_id'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('memberships_identity_class_set_idx').on(table.identityId, table.classSetId),
    index('memberships_class_set_status_idx').on(table.classSetId, table.verificationStatus),
  ]
);

/**
 * 8. PERMISSIONS (System Capability Codes)
 */
export const permissions = pgTable(
  'permissions',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(), // e.g. 'class_set:manage_members', 'finance:view_ledger'
    name: text('name').notNull(),
    description: text('description').notNull(),
    scope: text('scope').notNull().default('CLASS_SET'), // 'PLATFORM', 'ASSOCIATION', 'CLASS_SET'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('permissions_code_idx').on(table.code),
  ]
);

/**
 * 9. EXECUTIVE APPOINTMENTS (Federated Leadership)
 * Time-bound, revocable appointments with explicit start/end term dates.
 */
export const executiveAppointments = pgTable(
  'executive_appointments',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    associationId: text('association_id')
      .notNull()
      .references(() => associations.id, { onDelete: 'cascade' }),
    classSetId: text('class_set_id').references(() => classSets.id, { onDelete: 'cascade' }), // Nullable for association-wide officers
    identityId: text('identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    officeTitle: text('office_title').notNull(), // 'CHAIRMAN', 'SECRETARY', 'TREASURER', 'WELFARE_OFFICER'
    scope: text('scope').notNull().default('CLASS_SET'), // 'ASSOCIATION' | 'CLASS_SET'
    termStartDate: timestamp('term_start_date', { withTimezone: true }).notNull(),
    termEndDate: timestamp('term_end_date', { withTimezone: true }).notNull(),
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED'
    handoverMemoRef: text('handover_memo_ref'),
    appointedByIdentityId: text('appointed_by_identity_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('appointments_identity_status_idx').on(table.identityId, table.status),
    index('appointments_class_set_status_idx').on(table.classSetId, table.status),
  ]
);

/**
 * 10. APPOINTMENT PERMISSIONS (Delegated Executive Rights)
 */
export const appointmentPermissions = pgTable(
  'appointment_permissions',
  {
    id: text('id').primaryKey(),
    appointmentId: text('appointment_id')
      .notNull()
      .references(() => executiveAppointments.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('appointment_permission_idx').on(table.appointmentId, table.permissionId),
  ]
);

/**
 * 11. SCHEMA MIGRATIONS (Audit & Migration Tracking)
 */
export const schemaMigrations = pgTable(
  'schema_migrations',
  {
    id: serial('id').primaryKey(),
    migrationName: text('migration_name').notNull().unique(),
    batch: integer('batch').notNull(),
    status: text('status').notNull().default('APPLIED'), // 'APPLIED', 'REVERTED'
    appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
    details: jsonb('details').notNull().default({}),
  },
  (table) => [
    uniqueIndex('schema_migrations_name_idx').on(table.migrationName),
  ]
);

/**
 * 12. AUDIT LOGS (Administrative Audit Events)
 * Immutable audit trail of administrative, authentication, and permission events.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    actorIdentityId: text('actor_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    action: text('action').notNull(), // 'AUTH_SIGN_IN', 'ROLE_ASSIGNED', 'PERMISSION_REVOKED', 'PROFILE_UPDATED', 'UNAUTHORIZED_ACCESS_ATTEMPT'
    targetResource: text('target_resource').notNull(),
    scope: text('scope').notNull().default('PLATFORM'), // 'PLATFORM' | 'ASSOCIATION' | 'CLASS_SET'
    clientIpHash: text('client_ip_hash'),
    details: jsonb('details').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_tenant_action_idx').on(table.tenantId, table.action),
    index('audit_logs_actor_idx').on(table.actorIdentityId),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ]
);

/**
 * 13. PLATFORM ADMINISTRATORS (Platform Scope)
 * Technical administrators with platform-level rights, isolated from private welfare and voting.
 */
export const platformAdministrators = pgTable(
  'platform_administrators',
  {
    id: text('id').primaryKey(),
    identityId: text('identity_id')
      .notNull()
      .unique()
      .references(() => identities.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('PLATFORM_SUPER_ADMIN'), // 'PLATFORM_SUPER_ADMIN', 'PLATFORM_SUPPORT_ENGINEER'
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'REVOKED'
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('platform_admin_identity_idx').on(table.identityId),
  ]
);

/**
 * 14. ORGANISATION DOMAINS (Custom Domains & Class-Set Subdomains)
 * Supports independently configurable custom domains and automatically generated class-set subdomains.
 */
export const organisationDomains = pgTable(
  'organisation_domains',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    hostname: text('hostname').notNull().unique(), // e.g., 'alumni.agsoba.org.ng' or '8388.agsoba.org.ng'
    domainType: text('domain_type').notNull().default('PRIMARY'), // 'PRIMARY', 'ALIAS', 'CLASS_SET_SUBDOMAIN', 'SYSTEM'
    verificationStatus: text('verification_status').notNull().default('PENDING_VERIFICATION'), // 'PENDING_VERIFICATION', 'VERIFIED', 'VERIFICATION_FAILED', 'REVOKED'
    verificationChallenge: text('verification_challenge').notNull(),
    dnsConfigStatus: text('dns_config_status').notNull().default('PENDING'), // 'PENDING', 'READY', 'ERROR'
    hostingStatus: text('hosting_status').notNull().default('PENDING'), // 'PENDING', 'CONFIGURED', 'ERROR'
    tlsStatus: text('tls_status').notNull().default('PENDING'), // 'PENDING', 'READY', 'ERROR'
    isPrimaryDomain: boolean('is_primary_domain').notNull().default(false),
    classSetId: text('class_set_id').references(() => classSets.id, { onDelete: 'set null' }),
    lastVerificationAttempt: timestamp('last_verification_attempt', { withTimezone: true }),
    errorDetails: text('error_details'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('organisation_domains_hostname_idx').on(table.hostname),
    index('organisation_domains_tenant_idx').on(table.tenantId),
  ]
);

export const tenantsRelations = relations(tenants, ({ many }) => ({
  associations: many(associations),
  classSets: many(classSets),
  schoolAttendances: many(schoolAttendances),
}));

export const associationsRelations = relations(associations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [associations.tenantId],
    references: [tenants.id],
  }),
  classSets: many(classSets),
  executiveAppointments: many(executiveAppointments),
}));

export const identitiesRelations = relations(identities, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [identities.id],
    references: [profiles.identityId],
  }),
  schoolAttendances: many(schoolAttendances),
  classSetMemberships: many(classSetMemberships),
  executiveAppointments: many(executiveAppointments),
}));

export const classSetsRelations = relations(classSets, ({ one, many }) => ({
  association: one(associations, {
    fields: [classSets.associationId],
    references: [associations.id],
  }),
  tenant: one(tenants, {
    fields: [classSets.tenantId],
    references: [tenants.id],
  }),
  memberships: many(classSetMemberships),
  executiveAppointments: many(executiveAppointments),
}));

export const classSetMembershipsRelations = relations(classSetMemberships, ({ one }) => ({
  identity: one(identities, {
    fields: [classSetMemberships.identityId],
    references: [identities.id],
  }),
  classSet: one(classSets, {
    fields: [classSetMemberships.classSetId],
    references: [classSets.id],
  }),
  tenant: one(tenants, {
    fields: [classSetMemberships.tenantId],
    references: [tenants.id],
  }),
}));

export const executiveAppointmentsRelations = relations(executiveAppointments, ({ one, many }) => ({
  identity: one(identities, {
    fields: [executiveAppointments.identityId],
    references: [identities.id],
  }),
  classSet: one(classSets, {
    fields: [executiveAppointments.classSetId],
    references: [classSets.id],
  }),
  permissions: many(appointmentPermissions),
}));

/**
 * 15. COMMUNICATION TEMPLATES (Reusable Announcement Templates)
 */
export const communicationTemplates = pgTable(
  'communication_templates',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    channel: text('channel').notNull().default('EMAIL'), // 'EMAIL', 'SMS', 'IN_APP', 'PUSH'
    category: text('category').notNull().default('ANNOUNCEMENT'), // 'ANNOUNCEMENT', 'EVENT', 'FUNDRAISING', 'WELFARE'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('communication_templates_tenant_idx').on(table.tenantId),
  ]
);

/**
 * 16. COMMUNICATION CAMPAIGNS (Broadcast Campaigns & Queues)
 */
export const communicationCampaigns = pgTable(
  'communication_campaigns',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    associationId: text('association_id')
      .notNull()
      .references(() => associations.id, { onDelete: 'cascade' }),
    createdByIdentityId: text('created_by_identity_id')
      .references(() => identities.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    channel: text('channel').notNull().default('EMAIL'), // 'EMAIL', 'SMS', 'IN_APP', 'PUSH', 'MULTI_CHANNEL'
    templateId: text('template_id').references(() => communicationTemplates.id, { onDelete: 'set null' }),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    recipientSegment: jsonb('recipient_segment').notNull().default({}),
    status: text('status').notNull().default('DRAFT'), // 'DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    totalRecipients: integer('total_recipients').notNull().default(0),
    successfulCount: integer('successful_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('communication_campaigns_tenant_status_idx').on(table.tenantId, table.status),
  ]
);

/**
 * 17. DELIVERY LOGS (Audited Message Delivery Records)
 */
export const deliveryLogs = pgTable(
  'delivery_logs',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => communicationCampaigns.id, { onDelete: 'cascade' }),
    recipientIdentityId: text('recipient_identity_id')
      .references(() => identities.id, { onDelete: 'set null' }),
    recipientContact: text('recipient_contact').notNull(),
    channel: text('channel').notNull(),
    status: text('status').notNull().default('QUEUED'), // 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'
    providerResponse: text('provider_response'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('delivery_logs_campaign_status_idx').on(table.campaignId, table.status),
    index('delivery_logs_recipient_idx').on(table.recipientIdentityId),
  ]
);

/**
 * 18. MEETINGS (Formal Meetings & Agendas)
 * Formal meeting scheduling, quorum enforcement, and session lifecycle.
 */
export const meetings = pgTable(
  'meetings',
  {
    id: text('id').primaryKey(), // e.g. 'mtg_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    associationId: text('association_id')
      .notNull()
      .references(() => associations.id, { onDelete: 'cascade' }),
    classSetId: text('class_set_id').references(() => classSets.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    meetingType: text('meeting_type').notNull().default('ORDINARY'), // 'AGM', 'EXECUTIVE_COUNCIL', 'CLASS_SET_ASSEMBLY', 'COMMITTEE', 'EMERGENCY'
    scope: text('scope').notNull().default('CLASS_SET'), // 'ASSOCIATION', 'CLASS_SET'
    scheduledStartTime: timestamp('scheduled_start_time', { withTimezone: true }).notNull(),
    scheduledEndTime: timestamp('scheduled_end_time', { withTimezone: true }).notNull(),
    actualStartTime: timestamp('actual_start_time', { withTimezone: true }),
    actualEndTime: timestamp('actual_end_time', { withTimezone: true }),
    location: text('location').notNull(),
    isVirtual: boolean('is_virtual').notNull().default(false),
    virtualUrl: text('virtual_url'),
    quorumRequired: integer('quorum_required').notNull().default(5),
    status: text('status').notNull().default('SCHEDULED'), // 'SCHEDULED', 'IN_SESSION', 'ADJOURNED', 'CANCELLED'
    presidedByIdentityId: text('presided_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    recordedByIdentityId: text('recorded_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('meetings_tenant_status_idx').on(table.tenantId, table.status),
    index('meetings_class_set_idx').on(table.classSetId),
    index('meetings_start_time_idx').on(table.scheduledStartTime),
  ]
);

/**
 * 19. MEETING AGENDAS (Structured Meeting Order)
 */
export const meetingAgendas = pgTable(
  'meeting_agendas',
  {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    itemOrder: integer('item_order').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    presenterIdentityId: text('presenter_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    durationMinutes: integer('duration_minutes').notNull().default(15),
    status: text('status').notNull().default('PENDING'), // 'PENDING', 'DISCUSSED', 'DEFERRED', 'RESOLVED'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('meeting_agendas_meeting_order_idx').on(table.meetingId, table.itemOrder),
  ]
);

/**
 * 20. MEETING ATTENDANCES (Official Attendance Register)
 */
export const meetingAttendances = pgTable(
  'meeting_attendances',
  {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    identityId: text('identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('MEMBER'), // 'PRESIDING_OFFICER', 'SECRETARY', 'EXECUTIVE', 'MEMBER', 'OBSERVER'
    attendanceStatus: text('attendance_status').notNull().default('PRESENT'), // 'PRESENT', 'APOLOGY', 'ABSENT', 'LATE'
    signedInAt: timestamp('signed_in_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('meeting_attendance_unique_idx').on(table.meetingId, table.identityId),
    index('meeting_attendances_meeting_idx').on(table.meetingId),
  ]
);

/**
 * 21. MEETING MINUTES (Minutes Record & Cryptographic Adoption Hash)
 */
export const meetingMinutes = pgTable(
  'meeting_minutes',
  {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id')
      .notNull()
      .unique()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    bodyText: text('body_text').notNull(),
    adoptedStatus: text('adopted_status').notNull().default('DRAFT'), // 'DRAFT', 'UNDER_REVIEW', 'ADOPTED', 'AMENDED'
    motionProposedByIdentityId: text('motion_proposed_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    motionSecondedByIdentityId: text('motion_seconded_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    adoptedAt: timestamp('adopted_at', { withTimezone: true }),
    adoptionHash: text('adoption_hash'), // SHA-256 tamper-evident digest of body + signatories
    presidingSignature: text('presiding_signature'), // Formal signature token
    secretarySignature: text('secretary_signature'), // Formal signature token
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('meeting_minutes_meeting_id_idx').on(table.meetingId),
  ]
);

/**
 * 22. MEETING RESOLUTIONS (Resolution Ledger & Origin Traceability)
 */
export const meetingResolutions = pgTable(
  'meeting_resolutions',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    associationId: text('association_id')
      .notNull()
      .references(() => associations.id, { onDelete: 'cascade' }),
    meetingId: text('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    minuteId: text('minute_id').references(() => meetingMinutes.id, { onDelete: 'set null' }),
    resolutionNumber: text('resolution_number').notNull().unique(), // e.g. 'RES-AGSOBA-2026-001'
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull().default('GOVERNANCE'), // 'CONSTITUTIONAL', 'FINANCIAL', 'GOVERNANCE', 'WELFARE', 'MEMBERSHIP', 'PROJECT'
    bindingScope: text('binding_scope').notNull().default('ASSOCIATION'), // 'ASSOCIATION', 'CLASS_SET'
    status: text('status').notNull().default('PASSED'), // 'PASSED', 'SUPERSEDED', 'RESCINDED'
    effectiveDate: timestamp('effective_date', { withTimezone: true }).notNull(),
    passedAt: timestamp('passed_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('meeting_resolutions_number_idx').on(table.resolutionNumber),
    index('meeting_resolutions_meeting_idx').on(table.meetingId),
    index('meeting_resolutions_tenant_category_idx').on(table.tenantId, table.category),
  ]
);

/**
 * 23. MEETING ACTION TASKS (Action Items & Task Tracker)
 */
export const meetingActionTasks = pgTable(
  'meeting_action_tasks',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    meetingId: text('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    resolutionId: text('resolution_id').references(() => meetingResolutions.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    assigneeIdentityId: text('assignee_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    priority: text('priority').notNull().default('MEDIUM'), // 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    status: text('status').notNull().default('PENDING'), // 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED'
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completionNotes: text('completion_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('meeting_tasks_meeting_idx').on(table.meetingId),
    index('meeting_tasks_assignee_status_idx').on(table.assigneeIdentityId, table.status),
    index('meeting_tasks_tenant_status_idx').on(table.tenantId, table.status),
  ]
);

/**
 * 24. ELECTIONS (Polls, Surveys, and Formal Secret-Ballot Elections)
 * Manages general elections, constitutional referendums, officer by-elections, and governance polls.
 */
export const elections = pgTable(
  'elections',
  {
    id: text('id').primaryKey(), // e.g. 'elc_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    associationId: text('association_id')
      .notNull()
      .references(() => associations.id, { onDelete: 'cascade' }),
    classSetId: text('class_set_id').references(() => classSets.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    type: text('type').notNull().default('GENERAL_ELECTION'), // 'GENERAL_ELECTION', 'CONSTITUTIONAL_REFERENDUM', 'OFFICER_BY_ELECTION', 'OPINION_POLL', 'SURVEY'
    scope: text('scope').notNull().default('ASSOCIATION'), // 'ASSOCIATION', 'CLASS_SET'
    status: text('status').notNull().default('DRAFT'), // 'DRAFT', 'NOMINATIONS_OPEN', 'VETTING', 'ACTIVE', 'CLOSED', 'CERTIFIED', 'CANCELLED'
    secretBallot: boolean('secret_ballot').notNull().default(true),
    quorumPercentage: integer('quorum_percentage').notNull().default(25),
    requiresFinancialGoodStanding: boolean('requires_financial_good_standing').notNull().default(true),
    requiresVerifiedStatus: boolean('requires_verified_status').notNull().default(true),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    createdByIdentityId: text('created_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    certifiedAt: timestamp('certified_at', { withTimezone: true }),
    certifiedByIdentityId: text('certified_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    certificationNotes: text('certification_notes'),
    certificationSealHash: text('certification_seal_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('elections_tenant_status_idx').on(table.tenantId, table.status),
    index('elections_association_idx').on(table.associationId),
    index('elections_class_set_idx').on(table.classSetId),
    index('elections_start_time_idx').on(table.startTime),
  ]
);

/**
 * 25. ELECTION CONTESTS (Offices, Resolutions, or Ballot Measures)
 */
export const electionContests = pgTable(
  'election_contests',
  {
    id: text('id').primaryKey(), // e.g. 'cnt_xxx'
    electionId: text('election_id')
      .notNull()
      .references(() => elections.id, { onDelete: 'cascade' }),
    title: text('title').notNull(), // e.g. 'President General', 'Referendum Question 1'
    description: text('description'),
    contestOrder: integer('contest_order').notNull().default(1),
    maxChoices: integer('max_choices').notNull().default(1),
    allowAbstain: boolean('allow_abstain').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('election_contests_election_order_idx').on(table.electionId, table.contestOrder),
  ]
);

/**
 * 26. ELECTION CANDIDATES (Candidates or Ballot Options)
 */
export const electionCandidates = pgTable(
  'election_candidates',
  {
    id: text('id').primaryKey(), // e.g. 'cnd_xxx'
    contestId: text('contest_id')
      .notNull()
      .references(() => electionContests.id, { onDelete: 'cascade' }),
    candidateIdentityId: text('candidate_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    displayName: text('display_name').notNull(),
    manifesto: text('manifesto'),
    ballotOrder: integer('ballot_order').notNull().default(1),
    status: text('status').notNull().default('NOMINATED'), // 'NOMINATED', 'VETTED_APPROVED', 'DISQUALIFIED', 'WITHDRAWN'
    vettingNotes: text('vetting_notes'),
    vettedByIdentityId: text('vetted_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('election_candidates_contest_order_idx').on(table.contestId, table.ballotOrder),
  ]
);

/**
 * 27. ELECTION VOTER ROLL (Eligibility Register & Single Voting Right Enforcement)
 * Tracks who has cast a ballot to strictly prevent double-voting.
 * Deliberately contains NO reference to which candidate or option was chosen.
 */
export const electionVoterRoll = pgTable(
  'election_voter_roll',
  {
    id: text('id').primaryKey(), // e.g. 'vtr_xxx'
    electionId: text('election_id')
      .notNull()
      .references(() => elections.id, { onDelete: 'cascade' }),
    identityId: text('identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    eligibilityStatus: text('eligibility_status').notNull().default('ELIGIBLE'), // 'ELIGIBLE', 'INELIGIBLE_UNVERIFIED', 'INELIGIBLE_ARREARS', 'DISQUALIFIED'
    eligibilityReason: text('eligibility_reason'),
    hasVoted: boolean('has_voted').notNull().default(false),
    votedAt: timestamp('voted_at', { withTimezone: true }),
    ballotReceiptToken: text('ballot_receipt_token'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('election_voter_roll_unique_idx').on(table.electionId, table.identityId),
    index('election_voter_roll_has_voted_idx').on(table.electionId, table.hasVoted),
  ]
);

/**
 * 28. ELECTION BALLOTS (Anonymized Ballot Vault - Secret Ballot Enclave)
 * STRICT SECURITY CONSTITUTION:
 * This table NEVER stores identity_id, voter name, IP address, or session token.
 * Votes are cryptographically verified with an unlinkable blind verification hash.
 */
export const electionBallots = pgTable(
  'election_ballots',
  {
    id: text('id').primaryKey(), // e.g. 'blt_xxx'
    electionId: text('election_id')
      .notNull()
      .references(() => elections.id, { onDelete: 'cascade' }),
    contestId: text('contest_id')
      .notNull()
      .references(() => electionContests.id, { onDelete: 'cascade' }),
    candidateId: text('candidate_id').references(() => electionCandidates.id, { onDelete: 'cascade' }),
    isAbstention: boolean('is_abstention').notNull().default(false),
    castAt: timestamp('cast_at', { withTimezone: true }).defaultNow().notNull(),
    blindVerificationHash: text('blind_verification_hash').notNull(),
  },
  (table) => [
    index('election_ballots_election_contest_idx').on(table.electionId, table.contestId),
    index('election_ballots_candidate_idx').on(table.candidateId),
  ]
);

/**
 * 29. ELECTION RESULTS CERTIFICATIONS (Official Tally & Returning Officer Seal)
 * Permanent statutory certification of poll/election results with cryptographic hash seal.
 */
export const electionResultsCertifications = pgTable(
  'election_results_certifications',
  {
    id: text('id').primaryKey(), // e.g. 'crt_xxx'
    electionId: text('election_id')
      .notNull()
      .unique()
      .references(() => elections.id, { onDelete: 'cascade' }),
    certifiedByIdentityId: text('certified_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    totalRegisteredElectors: integer('total_registered_electors').notNull(),
    totalBallotsCast: integer('total_ballots_cast').notNull(),
    turnoutPercentage: text('turnout_percentage').notNull(),
    quorumRequiredPercentage: integer('quorum_required_percentage').notNull(),
    quorumAchieved: boolean('quorum_achieved').notNull(),
    tallySummaryJson: jsonb('tally_summary_json').notNull(),
    certificationSeal: text('certification_seal').notNull(), // SHA-256 seal of full results payload
    certifiedAt: timestamp('certified_at', { withTimezone: true }).defaultNow().notNull(),
    returningOfficerNotes: text('returning_officer_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('election_certifications_election_idx').on(table.electionId),
  ]
);

/**
 * 30. EVENTS (Reunions, Anniversaries, Dinners, and Formal Gatherings)
 * Core events registry supporting association-wide and class-set reunions.
 * Server-authoritative capacity and registration deadline enforcement.
 */
export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(), // e.g. 'evt_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    associationId: text('association_id')
      .notNull()
      .references(() => associations.id, { onDelete: 'cascade' }),
    classSetId: text('class_set_id').references(() => classSets.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    eventType: text('event_type').notNull().default('REUNION'), // 'REUNION', 'ANNIVERSARY', 'FOUNDERS_DAY', 'DINNER_DANCE', 'SPORTS', 'MEMORIAL'
    scope: text('scope').notNull().default('ASSOCIATION'), // 'ASSOCIATION', 'CLASS_SET'
    venue: text('venue').notNull(),
    isVirtual: boolean('is_virtual').notNull().default(false),
    virtualUrl: text('virtual_url'),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    registrationDeadline: timestamp('registration_deadline', { withTimezone: true }).notNull(),
    capacityLimit: integer('capacity_limit').notNull().default(500),
    bannerImageUrl: text('banner_image_url'),
    status: text('status').notNull().default('PUBLISHED'), // 'DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'CONCLUDED', 'CANCELLED'
    createdByIdentityId: text('created_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('events_tenant_status_idx').on(table.tenantId, table.status),
    index('events_start_date_idx').on(table.startDate),
    index('events_class_set_idx').on(table.classSetId),
  ]
);

/**
 * 31. EVENT TICKET TIERS (Reunion Ticket Options, Pricing, and Capacity Ring-Fencing)
 * Configurable ticket categories (Early Bird, Standard, VIP Patron, Young Alumnus Subsidy, Spouse Pass).
 */
export const eventTicketTiers = pgTable(
  'event_ticket_tiers',
  {
    id: text('id').primaryKey(), // e.g. 'tier_xxx'
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // 'Early Bird Alumnus', 'VIP Patron Table', 'Spouse / Guest Pass'
    description: text('description'),
    price: integer('price').notNull().default(0), // Amount in kobo (NGN), 0 = complimentary
    currency: text('currency').notNull().default('NGN'),
    tierCapacity: integer('tier_capacity').notNull().default(100),
    soldCount: integer('sold_count').notNull().default(0),
    maxPerMember: integer('max_per_member').notNull().default(2),
    isGuestAllowed: boolean('is_guest_allowed').notNull().default(true),
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'SOLD_OUT', 'HIDDEN'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('event_ticket_tiers_event_idx').on(table.eventId),
  ]
);

/**
 * 32. EVENT REGISTRATIONS (Confirmed Bookings & Cryptographic QR Badges)
 * Distinct from attendance! Records reservation intent, ticket tier, guest passes, and cryptographically signed QR badge token.
 */
export const eventRegistrations = pgTable(
  'event_registrations',
  {
    id: text('id').primaryKey(), // e.g. 'reg_xxx'
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    identityId: text('identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    ticketTierId: text('ticket_tier_id')
      .notNull()
      .references(() => eventTicketTiers.id, { onDelete: 'cascade' }),
    guestCount: integer('guest_count').notNull().default(0),
    guestNames: jsonb('guest_names').notNull().default([]), // array of strings
    registrationStatus: text('registration_status').notNull().default('CONFIRMED'), // 'CONFIRMED', 'WAITLISTED', 'CANCELLED'
    qrBadgeToken: text('qr_badge_token').notNull().unique(), // e.g. 'AGS-EVT-2025-ABCD1234'
    qrBadgeHash: text('qr_badge_hash').notNull(), // SHA-256 integrity seal
    dietaryRequirements: text('dietary_requirements'),
    specialAssistance: text('special_assistance'),
    totalAmount: integer('total_amount').notNull().default(0),
    paymentReference: text('payment_reference'),
    registeredAt: timestamp('registered_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('event_registrations_token_idx').on(table.qrBadgeToken),
    index('event_registrations_event_identity_idx').on(table.eventId, table.identityId),
    index('event_registrations_status_idx').on(table.eventId, table.registrationStatus),
  ]
);

/**
 * 33. EVENT ATTENDANCES (Gate Check-In & Physical Badge Issuance)
 * Strictly distinct from registration! Created ONLY upon physical or virtual arrival and QR credential scan.
 */
export const eventAttendances = pgTable(
  'event_attendances',
  {
    id: text('id').primaryKey(), // e.g. 'att_xxx'
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    registrationId: text('registration_id')
      .notNull()
      .references(() => eventRegistrations.id, { onDelete: 'cascade' }),
    identityId: text('identity_id').references(() => identities.id, { onDelete: 'cascade' }),
    attendeeType: text('attendee_type').notNull().default('ALUMNUS'), // 'ALUMNUS', 'GUEST'
    guestName: text('guest_name'),
    checkedInByIdentityId: text('checked_in_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    checkInTimestamp: timestamp('check_in_timestamp', { withTimezone: true }).defaultNow().notNull(),
    checkInMethod: text('check_in_method').notNull().default('QR_SCAN'), // 'QR_SCAN', 'BADGE_SCAN', 'MANUAL_OVERRIDE'
    checkpointLocation: text('checkpoint_location').notNull().default('Main Gate Protocol Desk'),
    badgeIssued: boolean('badge_issued').notNull().default(true),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('event_attendances_event_reg_idx').on(table.eventId, table.registrationId),
    index('event_attendances_timestamp_idx').on(table.eventId, table.checkInTimestamp),
  ]
);

/**
 * 34. EVENT RECONCILIATIONS (Statutory Post-Event Attendance & Financial Ledger Reconciliation)
 * Formal audit of capacity, registrations, confirmed check-ins, walk-ins, and no-shows with SHA-256 seal.
 */
export const eventReconciliations = pgTable(
  'event_reconciliations',
  {
    id: text('id').primaryKey(), // e.g. 'rec_xxx'
    eventId: text('event_id')
      .notNull()
      .unique()
      .references(() => events.id, { onDelete: 'cascade' }),
    reconciledByIdentityId: text('reconciled_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    totalCapacity: integer('total_capacity').notNull(),
    totalRegistrations: integer('total_registrations').notNull(),
    totalCheckedIn: integer('total_checked_in').notNull(),
    totalNoShows: integer('total_no_shows').notNull(),
    turnoutRate: text('turnout_rate').notNull(), // e.g. '87.4%'
    tierBreakdownJson: jsonb('tier_breakdown_json').notNull().default({}),
    reconciliationNotes: text('reconciliation_notes'),
    reconciliationSeal: text('reconciliation_seal').notNull(), // SHA-256 cryptographic seal
    reconciledAt: timestamp('reconciled_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('event_reconciliations_event_idx').on(table.eventId),
  ]
);

/**
 * 35. EVENT GALLERY ITEMS (Post-Event Memorial Archive & Historical Photos)
 * Community-curated and protocol-curated reunion photographs and commemorative memories.
 */
export const eventGalleryItems = pgTable(
  'event_gallery_items',
  {
    id: text('id').primaryKey(), // e.g. 'gal_xxx'
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    uploadedByIdentityId: text('uploaded_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    mediaUrl: text('media_url').notNull(),
    caption: text('caption').notNull(),
    category: text('category').notNull().default('REUNION_MOMENTS'), // 'CEREMONY', 'REUNION_MOMENTS', 'CLASS_PHOTO', 'DINNER_DANCE', 'HISTORIC_RETROSPECTIVE'
    takenYear: integer('taken_year'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('event_gallery_items_event_idx').on(table.eventId),
  ]
);

/**
 * 36. FINANCIAL ACCOUNTS (Double-Entry Chart of Accounts)
 * Structured accounts for Assets, Liabilities, Equity, Revenue, and Expenses.
 */
export const financialAccounts = pgTable(
  'financial_accounts',
  {
    id: text('id').primaryKey(), // e.g. 'acc_dues_rev'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    associationId: text('association_id')
      .notNull()
      .references(() => associations.id, { onDelete: 'cascade' }),
    code: text('code').notNull(), // e.g. '4010'
    name: text('name').notNull(), // e.g. 'Annual Dues Revenue'
    accountType: text('account_type').notNull(), // 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
    currency: text('currency').notNull().default('NGN'),
    isSystemDefault: boolean('is_system_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('financial_accounts_code_idx').on(table.tenantId, table.code),
    index('financial_accounts_type_idx').on(table.tenantId, table.accountType),
  ]
);

/**
 * 37. DUES OBLIGATIONS (Member Annual Subscriptions & Levies)
 * Tracks mandatory dues and special project levies assigned to alumni members.
 */
export const duesObligations = pgTable(
  'dues_obligations',
  {
    id: text('id').primaryKey(), // e.g. 'dues_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    identityId: text('identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    classSetId: text('class_set_id').references(() => classSets.id, { onDelete: 'set null' }),
    fiscalYear: integer('fiscal_year').notNull().default(2026),
    title: text('title').notNull(), // 'AGSOBA 2026 Annual National Dues'
    amountDue: integer('amount_due').notNull(), // in kobo (NGN)
    amountPaid: integer('amount_paid').notNull().default(0), // in kobo (NGN)
    status: text('status').notNull().default('UNPAID'), // 'UNPAID', 'PARTIAL', 'PAID', 'WAIVED'
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('dues_obligations_member_year_idx').on(table.identityId, table.fiscalYear),
    index('dues_obligations_status_idx').on(table.tenantId, table.status),
  ]
);

/**
 * 38. FINANCIAL TRANSACTIONS (Immutable Double-Entry Ledger Journal)
 * STRICT IMMUTABILITY RULE: UPDATE and DELETE operations are forbidden at database level.
 * Reversals must be executed via distinct adjusting journal entries.
 */
export const financialTransactions = pgTable(
  'financial_transactions',
  {
    id: text('id').primaryKey(), // e.g. 'txn_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    associationId: text('association_id')
      .notNull()
      .references(() => associations.id, { onDelete: 'cascade' }),
    debitAccountId: text('debit_account_id')
      .notNull()
      .references(() => financialAccounts.id),
    creditAccountId: text('credit_account_id')
      .notNull()
      .references(() => financialAccounts.id),
    amount: integer('amount').notNull(), // in kobo
    currency: text('currency').notNull().default('NGN'),
    description: text('description').notNull(),
    referenceId: text('reference_id'), // e.g. payment ref or dues obligation id
    idempotencyKey: text('idempotency_key').notNull().unique(), // UUIDv4 idempotency key
    recordedByIdentityId: text('recorded_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').notNull().default({}),
    postedAt: timestamp('posted_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('financial_transactions_idempotency_idx').on(table.idempotencyKey),
    index('financial_transactions_tenant_date_idx').on(table.tenantId, table.postedAt),
    index('financial_transactions_ref_idx').on(table.referenceId),
  ]
);

/**
 * 39. PAYMENT GATEWAY LOGS (Paystack / Flutterwave Secure Webhook Audit Trail)
 * Stores raw webhook payloads, HMAC SHA-512 signatures, and idempotency states.
 * Guarantees server-side payment verification (no client-declared success).
 */
export const paymentGatewayLogs = pgTable(
  'payment_gateway_logs',
  {
    id: text('id').primaryKey(), // e.g. 'wh_xxx'
    gatewayName: text('gateway_name').notNull().default('PAYSTACK'), // 'PAYSTACK', 'FLUTTERWAVE'
    eventType: text('eventType').notNull(), // 'charge.success', 'transfer.success'
    payloadJson: jsonb('payload_json').notNull(),
    hmacSignature: text('hmac_signature').notNull(),
    verificationStatus: text('verification_status').notNull().default('VERIFIED_SUCCESS'), // 'VERIFIED_SUCCESS', 'SIGNATURE_MISMATCH', 'DUPLICATE_IDEMPOTENCY', 'PROCESSING_FAILED'
    idempotencyKey: text('idempotency_key').notNull().unique(),
    processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('payment_gateway_logs_idempotency_idx').on(table.idempotencyKey),
    index('payment_gateway_logs_gateway_status_idx').on(table.gatewayName, table.verificationStatus),
  ]
);

/**
 * 40. PLEDGES (Development Project & Association Pledges)
 * Distinct from cash received. Tracks member commitments and fulfillment progress.
 */
export const pledges = pgTable(
  'pledges',
  {
    id: text('id').primaryKey(), // e.g. 'pld_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    identityId: text('identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    classSetId: text('class_set_id').references(() => classSets.id, { onDelete: 'set null' }),
    projectTitle: text('project_title').notNull(), // 'AGSOBA 100th Anniversary Hall Restoration'
    amountPledged: integer('amount_pledged').notNull(), // in kobo
    amountFulfilled: integer('amount_fulfilled').notNull().default(0), // in kobo
    status: text('status').notNull().default('PLEDGED'), // 'PLEDGED', 'PARTIAL_FULFILLED', 'FULFILLED', 'CANCELLED'
    targetDate: timestamp('target_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('pledges_tenant_status_idx').on(table.tenantId, table.status),
    index('pledges_identity_idx').on(table.identityId),
  ]
);

/**
 * 41. EXPENSE REQUISITIONS (Multi-Level Approval Expense Workflow)
 * Requisitions require hierarchical approval (Initiator -> Treasurer -> President -> Disbursed).
 */
export const expenseRequisitions = pgTable(
  'expense_requisitions',
  {
    id: text('id').primaryKey(), // e.g. 'exp_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    associationId: text('association_id')
      .notNull()
      .references(() => associations.id, { onDelete: 'cascade' }),
    requestedByIdentityId: text('requested_by_identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    amount: integer('amount').notNull(), // in kobo
    category: text('category').notNull().default('OPERATIONAL'), // 'OPERATIONAL', 'MAINTENANCE', 'WELFARE', 'EVENT', 'CAPITAL_PROJECT'
    status: text('status').notNull().default('SUBMITTED'), // 'SUBMITTED', 'TREASURER_APPROVED', 'PRESIDENT_APPROVED', 'DISBURSED', 'REJECTED'
    treasurerApprovedByIdentityId: text('treasurer_approved_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    presidentApprovedByIdentityId: text('president_approved_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    disbursedByIdentityId: text('disbursed_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('expense_requisitions_tenant_status_idx').on(table.tenantId, table.status),
  ]
);

/**
 * 42. WELFARE PROGRAMS (Distress Funds & Medical Grant Categories)
 * Configurable welfare funds with ring-fenced budgets (e.g. 'AGSOBA Medical Emergency Fund').
 */
export const welfarePrograms = pgTable(
  'welfare_programs',
  {
    id: text('id').primaryKey(), // e.g. 'wprog_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    associationId: text('association_id')
      .notNull()
      .references(() => associations.id, { onDelete: 'cascade' }),
    title: text('title').notNull(), // 'AGSOBA National Emergency Medical & Bereavement Fund'
    description: text('description').notNull(),
    allocatedBudget: integer('allocated_budget').notNull().default(100000000), // in kobo (NGN 1,000,000)
    disbursedTotal: integer('disbursed_total').notNull().default(0), // in kobo
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'SUSPENDED', 'CLOSED'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('welfare_programs_tenant_status_idx').on(table.tenantId, table.status),
  ]
);

/**
 * 43. WELFARE CASES (Confidential Distress Claims & Case File Vault)
 * STRICT PRIVACY CONSTITUTION:
 * Cases are air-gapped from general alumni directory and public reports.
 * Only authorized Welfare Committee members and case beneficiaries have read access.
 */
export const welfareCases = pgTable(
  'welfare_cases',
  {
    id: text('id').primaryKey(), // e.g. 'wcase_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    programId: text('program_id')
      .notNull()
      .references(() => welfarePrograms.id, { onDelete: 'cascade' }),
    beneficiaryIdentityId: text('beneficiary_identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    submittedByIdentityId: text('submitted_by_identity_id')
      .references(() => identities.id, { onDelete: 'set null' }),
    category: text('category').notNull().default('MEDICAL_EMERGENCY'), // 'MEDICAL_EMERGENCY', 'BEREAVEMENT', 'DISTRESS_RELIEF', 'EDUCATIONAL_GRANT'
    summary: text('summary').notNull(),
    confidentialCaseNotes: text('confidential_case_notes').notNull(), // Encrypted / strictly restricted notes
    requestedAmount: integer('requested_amount').notNull(), // in kobo
    approvedAmount: integer('approved_amount').notNull().default(0), // in kobo
    status: text('status').notNull().default('SUBMITTED'), // 'SUBMITTED', 'UNDER_REVIEW', 'COMMITTEE_APPROVED', 'DISBURSED', 'REJECTED', 'CLOSED'
    anonymizedReferenceCode: text('anonymized_reference_code').notNull().unique(), // e.g. 'WLF-RELIEF-2026-X77' for public ledger tracing
    closureNotes: text('closure_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('welfare_cases_anon_ref_idx').on(table.anonymizedReferenceCode),
    index('welfare_cases_tenant_status_idx').on(table.tenantId, table.status),
    index('welfare_cases_beneficiary_idx').on(table.beneficiaryIdentityId),
  ]
);

/**
 * 44. WELFARE CASE REVIEWS (Multi-Officer Welfare Committee Review Log)
 * Auditable votes and recommendations by authorized welfare officers.
 */
export const welfareCaseReviews = pgTable(
  'welfare_case_reviews',
  {
    id: text('id').primaryKey(), // e.g. 'wrev_xxx'
    caseId: text('case_id')
      .notNull()
      .references(() => welfareCases.id, { onDelete: 'cascade' }),
    reviewerIdentityId: text('reviewer_identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    recommendation: text('recommendation').notNull().default('APPROVE'), // 'APPROVE', 'REQUEST_INFO', 'REJECT'
    recommendedAmount: integer('recommended_amount').notNull().default(0), // in kobo
    reviewComments: text('review_comments').notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('welfare_case_reviews_case_idx').on(table.caseId),
  ]
);

/**
 * 45. WELFARE DISBURSEMENTS (Emergency Financial Grant Payouts)
 * Links approved welfare cases to financial ledger transaction entries using anonymized references.
 */
export const welfareDisbursements = pgTable(
  'welfare_disbursements',
  {
    id: text('id').primaryKey(), // e.g. 'wdis_xxx'
    caseId: text('case_id')
      .notNull()
      .unique()
      .references(() => welfareCases.id, { onDelete: 'cascade' }),
    disbursedByIdentityId: text('disbursed_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    amountDisbursed: integer('amount_disbursed').notNull(), // in kobo
    bankReference: text('bank_reference').notNull(),
    disbursedAt: timestamp('disbursed_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('welfare_disbursements_case_idx').on(table.caseId),
  ]
);

/**
 * 46. WELFARE ACCESS LOGS (Mandatory Read-Access Security Audit Trail)
 * Enforces zero-trust policy: every query accessing confidential welfare records creates an immutable access log entry.
 */
export const welfareAccessLogs = pgTable(
  'welfare_access_logs',
  {
    id: text('id').primaryKey(), // e.g. 'walog_xxx'
    caseId: text('case_id')
      .notNull()
      .references(() => welfareCases.id, { onDelete: 'cascade' }),
    accessorIdentityId: text('accessor_identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    accessReason: text('access_reason').notNull().default('COMMITTEE_REVIEW'), // 'COMMITTEE_REVIEW', 'FINANCIAL_AUDIT', 'BENEFICIARY_INQUIRY'
    clientIpHash: text('client_ip_hash'),
    accessedAt: timestamp('accessed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('welfare_access_logs_case_idx').on(table.caseId),
    index('welfare_access_logs_accessor_idx').on(table.accessorIdentityId),
  ]
);

/**
 * 47. DEVELOPMENT PROJECTS (School & Alumni Capital Initiatives)
 * Supports infrastructure proposals, approved budgets, capital campaigns, and locked financial baselines.
 */
export const developmentProjects = pgTable(
  'development_projects',
  {
    id: text('id').primaryKey(), // e.g. 'proj_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    associationId: text('association_id')
      .notNull()
      .references(() => associations.id, { onDelete: 'cascade' }),
    classSetId: text('class_set_id').references(() => classSets.id, { onDelete: 'set null' }), // Optional: set-specific project (e.g. 8388 Centenary gate)
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull().default('INFRASTRUCTURE'), // 'INFRASTRUCTURE', 'SCHOLARSHIP', 'SPORTS', 'ACADEMIC_EQUIPMENT', 'HISTORICAL_RESTORATION'
    status: text('status').notNull().default('PROPOSED'), // 'PROPOSED', 'APPROVED', 'IN_PROGRESS', 'MILESTONE_AUDIT', 'COMPLETED', 'SUSPENDED'
    budgetApprovedKobo: bigint('budget_approved_kobo', { mode: 'number' }).notNull().default(0), // Locked once approved
    fundsRaisedKobo: bigint('funds_raised_kobo', { mode: 'number' }).notNull().default(0),
    fundsDisbursedKobo: bigint('funds_disbursed_kobo', { mode: 'number' }).notNull().default(0),
    isBudgetLocked: boolean('is_budget_locked').notNull().default(false),
    proposedByIdentityId: text('proposed_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    approvedByIdentityId: text('approved_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    startDate: timestamp('start_date', { withTimezone: true }),
    targetCompletionDate: timestamp('target_completion_date', { withTimezone: true }),
    actualCompletionDate: timestamp('actual_completion_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('dev_projects_tenant_status_idx').on(table.tenantId, table.status),
    index('dev_projects_assoc_idx').on(table.associationId),
    index('dev_projects_class_set_idx').on(table.classSetId),
  ]
);

/**
 * 48. PROJECT MILESTONES (Deliverables & Progress Verification)
 * Step-by-step deliverable tracking with physical/financial audit sign-off.
 */
export const projectMilestones = pgTable(
  'project_milestones',
  {
    id: text('id').primaryKey(), // e.g. 'pmil_xxx'
    projectId: text('project_id')
      .notNull()
      .references(() => developmentProjects.id, { onDelete: 'cascade' }),
    milestoneOrder: integer('milestone_order').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    allocatedBudgetKobo: bigint('allocated_budget_kobo', { mode: 'number' }).notNull().default(0),
    disbursedBudgetKobo: bigint('disbursed_budget_kobo', { mode: 'number' }).notNull().default(0),
    percentageWeight: integer('percentage_weight').notNull().default(0), // 0 to 100
    status: text('status').notNull().default('PENDING'), // 'PENDING', 'IN_PROGRESS', 'SUBMITTED_FOR_AUDIT', 'AUDIT_APPROVED', 'COMPLETED'
    targetDate: timestamp('target_date', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    auditNotes: text('audit_notes'),
    auditedByIdentityId: text('audited_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    auditedAt: timestamp('audited_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('project_milestones_project_order_idx').on(table.projectId, table.milestoneOrder),
    index('project_milestones_status_idx').on(table.projectId, table.status),
  ]
);

/**
 * 49. PROJECT DONATIONS (Contributions & Donor Wall Registry)
 * Records individual and corporate project donations linked to the financial ledger with recognition options.
 */
export const projectDonations = pgTable(
  'project_donations',
  {
    id: text('id').primaryKey(), // e.g. 'pdon_xxx'
    projectId: text('project_id')
      .notNull()
      .references(() => developmentProjects.id, { onDelete: 'cascade' }),
    donorIdentityId: text('donor_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    donorNameOverride: text('donor_name_override'), // For anonymous or custom dedication
    classSetId: text('class_set_id').references(() => classSets.id, { onDelete: 'set null' }),
    amountKobo: bigint('amount_kobo', { mode: 'number' }).notNull(),
    currency: text('currency').notNull().default('NGN'),
    recognitionTier: text('recognition_tier').notNull().default('CONTRIBUTOR'), // 'SUPPORTER', 'BUILDER', 'BENEFACTOR', 'PATRON', 'GRAND_PATRON'
    isAnonymous: boolean('is_anonymous').notNull().default(false),
    pledgeId: text('pledge_id').references(() => pledges.id, { onDelete: 'set null' }), // Optional linkage to existing pledge
    paymentReference: text('payment_reference').notNull().unique(), // e.g. Paystack ref or bank teller
    status: text('status').notNull().default('CONFIRMED'), // 'PENDING', 'CONFIRMED', 'RECONCILED', 'CANCELLED'
    donorMessage: text('donor_message'),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('project_donations_pay_ref_idx').on(table.paymentReference),
    index('project_donations_project_idx').on(table.projectId),
    index('project_donations_donor_idx').on(table.donorIdentityId),
    index('project_donations_tier_idx').on(table.projectId, table.recognitionTier),
  ]
);

/**
 * 50. PROJECT DISBURSEMENTS (Milestone Payments & Contractor Payouts)
 * Strict link between approved project milestones and financial journal ledger entries.
 */
export const projectDisbursements = pgTable(
  'project_disbursements',
  {
    id: text('id').primaryKey(), // e.g. 'pdis_xxx'
    projectId: text('project_id')
      .notNull()
      .references(() => developmentProjects.id, { onDelete: 'cascade' }),
    milestoneId: text('milestone_id').references(() => projectMilestones.id, { onDelete: 'set null' }),
    payeeName: text('payee_name').notNull(), // Contractor, vendor, or project supervisor
    amountKobo: bigint('amount_kobo', { mode: 'number' }).notNull(),
    currency: text('currency').notNull().default('NGN'),
    bankReference: text('bank_reference').notNull(),
    disbursedByIdentityId: text('disbursed_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    requisitionId: text('requisition_id').references(() => expenseRequisitions.id, { onDelete: 'set null' }),
    financialTransactionId: text('financial_transaction_id').references(() => financialTransactions.id, { onDelete: 'set null' }),
    notes: text('notes'),
    disbursedAt: timestamp('disbursed_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('project_disbursements_project_idx').on(table.projectId),
    index('project_disbursements_milestone_idx').on(table.milestoneId),
  ]
);

/**
 * 51. HERITAGE DOCUMENTS (Digital Archive & Historical Records)
 * Stores digitized historical photos, magazines, founder speeches, oral histories, blueprints, and school registers with provenance metadata and SHA-256 integrity checksums.
 */
export const heritageDocuments = pgTable(
  'heritage_documents',
  {
    id: text('id').primaryKey(), // e.g. 'hdoc_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull().default('HISTORICAL_PHOTO'), // 'HISTORICAL_PHOTO', 'MAGAZINE_PUBLICATION', 'FOUNDERS_SPEECH', 'ORAL_HISTORY_AUDIO', 'CAMPUS_BLUEPRINT', 'STUDENT_REGISTER', 'ARCHIVAL_MANUSCRIPT'
    accessLevel: text('access_level').notNull().default('PUBLIC'), // 'PUBLIC', 'VERIFIED_ALUMNI', 'EXECUTIVE_ONLY', 'RESTRICTED'
    mediaUrl: text('media_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    fileSize: integer('file_size').notNull().default(0), // in bytes
    mimeType: text('mime_type').notNull().default('image/jpeg'),
    checksumSha256: text('checksum_sha256').notNull(), // Integrity seal hash
    provenanceMetadata: jsonb('provenance_metadata').notNull().default({}), // author, accession date, donor, archival source, historical era
    uploadedByIdentityId: text('uploaded_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    viewCount: integer('view_count').notNull().default(0),
    downloadCount: integer('download_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('heritage_documents_tenant_category_idx').on(table.tenantId, table.category),
    index('heritage_documents_access_idx').on(table.accessLevel),
    uniqueIndex('heritage_documents_checksum_idx').on(table.checksumSha256),
  ]
);

/**
 * 52. HERITAGE COLLECTIONS (Curated Archival Exhibitions)
 */
export const heritageCollections = pgTable(
  'heritage_collections',
  {
    id: text('id').primaryKey(), // e.g. 'hcol_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    curatorIdentityId: text('curator_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    isFeatured: boolean('is_featured').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('heritage_collections_tenant_idx').on(table.tenantId),
  ]
);

/**
 * 53. HERITAGE COLLECTION ITEMS (Mapping Documents to Curated Collections)
 */
export const heritageCollectionItems = pgTable(
  'heritage_collection_items',
  {
    id: text('id').primaryKey(), // e.g. 'hitem_xxx'
    collectionId: text('collection_id')
      .notNull()
      .references(() => heritageCollections.id, { onDelete: 'cascade' }),
    documentId: text('document_id')
      .notNull()
      .references(() => heritageDocuments.id, { onDelete: 'cascade' }),
    itemOrder: integer('item_order').notNull().default(1),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('heritage_collection_item_unique_idx').on(table.collectionId, table.documentId),
    index('heritage_collection_items_collection_idx').on(table.collectionId),
  ]
);

/**
 * 54. HERITAGE ACCESS AUDIT LOGS (Zero-Trust Archival Access Trail)
 */
export const heritageAccessAuditLogs = pgTable(
  'heritage_access_audit_logs',
  {
    id: text('id').primaryKey(), // e.g. 'halog_xxx'
    documentId: text('document_id')
      .notNull()
      .references(() => heritageDocuments.id, { onDelete: 'cascade' }),
    accessorIdentityId: text('accessor_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    accessType: text('access_type').notNull().default('VIEW'), // 'VIEW', 'DOWNLOAD', 'METADATA_INSPECT'
    clientIpHash: text('client_ip_hash'),
    accessedAt: timestamp('accessed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('heritage_access_logs_document_idx').on(table.documentId),
    index('heritage_access_logs_accessor_idx').on(table.accessorIdentityId),
  ]
);

/**
 * 55. ALUMNI BUSINESSES (Verified Business & Enterprise Directory)
 */
export const alumniBusinesses = pgTable(
  'alumni_businesses',
  {
    id: text('id').primaryKey(), // e.g. 'biz_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    ownerIdentityId: text('owner_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    businessName: text('business_name').notNull(),
    industry: text('industry').notNull(),
    description: text('description').notNull(),
    website: text('website'),
    businessEmail: text('business_email').notNull(),
    businessPhone: text('business_phone'),
    address: text('address'),
    verificationStatus: text('verification_status').notNull().default('PENDING_VERIFICATION'), // 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'
    classSetId: text('class_set_id').references(() => classSets.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('alumni_businesses_tenant_industry_idx').on(table.tenantId, table.industry),
    index('alumni_businesses_status_idx').on(table.verificationStatus),
  ]
);

/**
 * 56. MENTORSHIP PROGRAMS (Structured Mentorship Schemes)
 */
export const mentorshipPrograms = pgTable(
  'mentorship_programs',
  {
    id: text('id').primaryKey(), // e.g. 'mprog_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'CLOSED'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('mentorship_programs_tenant_idx').on(table.tenantId),
  ]
);

/**
 * 57. MENTORSHIP PAIRS (Mentor-Mentee Pairing Queue & Relationships)
 */
export const mentorshipPairs = pgTable(
  'mentorship_pairs',
  {
    id: text('id').primaryKey(), // e.g. 'mpair_xxx'
    programId: text('program_id')
      .notNull()
      .references(() => mentorshipPrograms.id, { onDelete: 'cascade' }),
    mentorIdentityId: text('mentor_identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    menteeIdentityId: text('mentee_identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'cascade' }),
    focusArea: text('focus_area').notNull(),
    status: text('status').notNull().default('PENDING_MATCH'), // 'PENDING_MATCH', 'ACTIVE', 'COMPLETED', 'DECLINED'
    meetingNotes: text('meeting_notes'),
    pairedAt: timestamp('paired_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('mentorship_pairs_program_idx').on(table.programId),
    index('mentorship_pairs_mentor_idx').on(table.mentorIdentityId),
    index('mentorship_pairs_mentee_idx').on(table.menteeIdentityId),
  ]
);

/**
 * 58. CAREER OPPORTUNITIES (Jobs, Internships, RFPs, and Collaboration Board)
 */
export const careerOpportunities = pgTable(
  'career_opportunities',
  {
    id: text('id').primaryKey(), // e.g. 'copp_xxx'
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    postedByIdentityId: text('posted_by_identity_id').references(() => identities.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    companyName: text('company_name').notNull(),
    location: text('location').notNull(),
    employmentType: text('employment_type').notNull().default('FULL_TIME'), // 'FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'REMOTE'
    description: text('description').notNull(),
    applicationUrl: text('application_url'),
    contactEmail: text('contact_email').notNull(),
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'CLOSED'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('career_opportunities_tenant_type_idx').on(table.tenantId, table.employmentType),
    index('career_opportunities_status_idx').on(table.status),
  ]
);




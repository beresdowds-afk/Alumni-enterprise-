import { db } from './index.ts';
import { tenants, associations, auditLogs } from './schema.ts';
import { eq } from 'drizzle-orm';
import { recordAuditEvent, UserSecurityContext } from './authServices.ts';

export interface TenantBrandingDetails {
  tenantId: string;
  schoolName: string;
  schoolCode: string;
  country: string;
  state: string | null;
  city: string | null;
  defaultCurrency: string;
  defaultTimezone: string;
  associationId: string;
  associationName: string;
  associationAcronym: string;
  classSetFormula: string;
  constitutionVersion: string;
  brandingConfig: {
    motto?: string;
    crestUrl?: string;
    logoUrl?: string;
    primaryColor: string;
    accentColor: string;
    secondaryColor?: string;
    fontFamily: string;
    contactEmail: string;
    contactPhone: string;
    postalAddress: string;
    website: string;
    customDomain?: string;
    privacyPolicyUrl?: string;
    communicationPolicy?: string;
    historicalNamingConvention: string;
  };
  updatedAt: string;
}

/**
 * Fetch dynamic branding and identity configuration for a tenant.
 */
export async function getTenantBranding(tenantId: string): Promise<TenantBrandingDetails | null> {
  const tenantRows = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenantRows.length) return null;
  const tenant = tenantRows[0];

  const assocRows = await db.select().from(associations).where(eq(associations.tenantId, tenantId));
  const assoc = assocRows[0] || {
    id: `asc_${tenant.code}`,
    name: `${tenant.name} Alumni Association`,
    acronym: tenant.code.toUpperCase(),
    classSetFormula: '{acronym} {yy_adm}{zz_grad}',
    constitutionVersion: '2024.1',
  };

  const rawConfig = (tenant.brandingConfig as any) || {};

  return {
    tenantId: tenant.id,
    schoolName: tenant.name,
    schoolCode: tenant.code,
    country: tenant.country,
    state: tenant.state,
    city: tenant.city,
    defaultCurrency: tenant.defaultCurrency,
    defaultTimezone: tenant.defaultTimezone,
    associationId: assoc.id,
    associationName: assoc.name,
    associationAcronym: assoc.acronym,
    classSetFormula: assoc.classSetFormula,
    constitutionVersion: assoc.constitutionVersion,
    brandingConfig: {
      motto: rawConfig.motto || 'The First and the Best',
      crestUrl: rawConfig.crestUrl || '/assets/crests/agsoba_crest.png',
      logoUrl: rawConfig.logoUrl || '/assets/crests/agsoba_logo.png',
      primaryColor: rawConfig.primaryColor || '#0f172a',
      accentColor: rawConfig.accentColor || '#f59e0b',
      secondaryColor: rawConfig.secondaryColor || '#065f46',
      fontFamily: rawConfig.fontFamily || 'Inter',
      contactEmail: rawConfig.contactEmail || 'secretariat@agsoba.org.ng',
      contactPhone: rawConfig.contactPhone || '+234 803 000 0108',
      postalAddress: rawConfig.postalAddress || 'Abeokuta, Ogun State, Nigeria',
      website: rawConfig.website || 'https://agsoba.org.ng',
      customDomain: rawConfig.customDomain || 'alumni.agsoba.org.ng',
      privacyPolicyUrl: rawConfig.privacyPolicyUrl || 'https://agsoba.org.ng/privacy',
      communicationPolicy: rawConfig.communicationPolicy || 'Official broadcasts permitted only via vetted Executives.',
      historicalNamingConvention: rawConfig.historicalNamingConvention || 'AGSOBA YYZZ (Adm/Grad 2-digit combinations)',
    },
    updatedAt: tenant.updatedAt ? new Date(tenant.updatedAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Update tenant branding with strict cross-tenant isolation enforcement.
 * Principle: One tenant CANNOT modify another tenant's branding.
 */
export async function updateTenantBranding(
  targetTenantId: string,
  updates: {
    schoolName?: string;
    associationName?: string;
    associationAcronym?: string;
    defaultCurrency?: string;
    defaultTimezone?: string;
    brandingConfig?: Record<string, any>;
  },
  actorContext?: UserSecurityContext | null,
  clientIpHash?: string
): Promise<{ success: boolean; data?: TenantBrandingDetails; error?: string; code?: string }> {
  // 1. Cross-Tenant Authorization Check
  if (actorContext) {
    const isPlatformSuperAdmin = actorContext.platformAdmin?.status === 'ACTIVE';
    const isTenantAssociationOfficer = actorContext.associationAppointments.some(
      (a) => a.tenantId === targetTenantId && a.status === 'ACTIVE'
    );

    if (!isPlatformSuperAdmin && !isTenantAssociationOfficer) {
      await recordAuditEvent({
        tenantId: targetTenantId,
        actorIdentityId: actorContext.identity.id,
        action: 'CROSS_TENANT_MUTATION_ATTEMPT_BLOCKED',
        targetResource: `tenants/${targetTenantId}/branding`,
        scope: 'PLATFORM',
        clientIpHash,
        details: {
          attemptedTenantId: targetTenantId,
          actorEmail: actorContext.identity.email,
          reason: 'Actor has no administrative mandate for this tenant.',
        },
      });

      return {
        success: false,
        error: `Cross-Tenant Security Violation: You do not have authority to modify tenant ${targetTenantId}.`,
        code: 'CROSS_TENANT_VIOLATION',
      };
    }
  }

  // 2. Fetch existing tenant
  const tenantRows = await db.select().from(tenants).where(eq(tenants.id, targetTenantId));
  if (!tenantRows.length) {
    return { success: false, error: 'Tenant not found.', code: 'TENANT_NOT_FOUND' };
  }
  const existingTenant = tenantRows[0];
  const existingConfig = (existingTenant.brandingConfig as any) || {};

  // 3. Merge updates
  const newConfig = {
    ...existingConfig,
    ...(updates.brandingConfig || {}),
  };

  await db
    .update(tenants)
    .set({
      name: updates.schoolName || existingTenant.name,
      defaultCurrency: updates.defaultCurrency || existingTenant.defaultCurrency,
      defaultTimezone: updates.defaultTimezone || existingTenant.defaultTimezone,
      brandingConfig: newConfig,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, targetTenantId));

  // Update association name/acronym if provided
  if (updates.associationName || updates.associationAcronym) {
    await db
      .update(associations)
      .set({
        name: updates.associationName,
        acronym: updates.associationAcronym,
        updatedAt: new Date(),
      })
      .where(eq(associations.tenantId, targetTenantId));
  }

  // Log successful branding audit
  await recordAuditEvent({
    tenantId: targetTenantId,
    actorIdentityId: actorContext?.identity.id || null,
    action: 'TENANT_BRANDING_UPDATED',
    targetResource: `tenants/${targetTenantId}/branding`,
    scope: 'ASSOCIATION',
    clientIpHash,
    details: {
      updatedFields: Object.keys(updates),
      newConfig,
    },
  });

  const refreshed = await getTenantBranding(targetTenantId);
  return { success: true, data: refreshed! };
}

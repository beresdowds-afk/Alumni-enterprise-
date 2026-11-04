import { db } from './index.ts';
import {
  tenants,
  associations,
  classSets,
  identities,
  schemaMigrations,
  permissions,
} from './schema.ts';
import { desc, eq } from 'drizzle-orm';

/**
 * Service to fetch all configured tenants from PostgreSQL.
 */
export async function getTenants() {
  try {
    return await db.select().from(tenants);
  } catch (error) {
    console.error('Failed to query tenants from Cloud SQL:', error);
    throw new Error('Database query failed while fetching tenants.', { cause: error });
  }
}

/**
 * Service to fetch associations for a tenant.
 */
export async function getAssociations(tenantId?: string) {
  try {
    if (tenantId) {
      return await db.select().from(associations).where(eq(associations.tenantId, tenantId));
    }
    return await db.select().from(associations);
  } catch (error) {
    console.error('Failed to query associations from Cloud SQL:', error);
    throw new Error('Database query failed while fetching associations.', { cause: error });
  }
}

/**
 * Service to fetch canonical class sets.
 */
export async function getClassSets(associationId?: string) {
  try {
    if (associationId) {
      return await db
        .select()
        .from(classSets)
        .where(eq(classSets.associationId, associationId))
        .orderBy(desc(classSets.admissionYear));
    }
    return await db.select().from(classSets).orderBy(desc(classSets.admissionYear));
  } catch (error) {
    console.error('Failed to query class sets from Cloud SQL:', error);
    throw new Error('Database query failed while fetching class sets.', { cause: error });
  }
}

/**
 * Service to fetch applied migrations from schema_migrations.
 */
export async function getSchemaMigrations() {
  try {
    return await db.select().from(schemaMigrations).orderBy(desc(schemaMigrations.appliedAt));
  } catch (error) {
    console.error('Failed to query migrations from Cloud SQL:', error);
    throw new Error('Database query failed while fetching migrations.', { cause: error });
  }
}

/**
 * Service to fetch defined permissions.
 */
export async function getSystemPermissions() {
  try {
    return await db.select().from(permissions);
  } catch (error) {
    console.error('Failed to query permissions from Cloud SQL:', error);
    throw new Error('Database query failed while fetching permissions.', { cause: error });
  }
}

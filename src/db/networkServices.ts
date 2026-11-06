import { db } from './index.ts';
import {
  alumniBusinesses,
  mentorshipPrograms,
  mentorshipPairs,
  careerOpportunities,
  identities,
} from './schema.ts';
import { eq, desc, and } from 'drizzle-orm';

export async function getAlumniBusinesses(tenantId: string = 'tenant_ags_abeokuta', industry?: string) {
  try {
    await seedBaselineNetworkIfEmpty();
    if (industry) {
      return await db
        .select({
          business: alumniBusinesses,
          owner: identities,
        })
        .from(alumniBusinesses)
        .leftJoin(identities, eq(alumniBusinesses.ownerIdentityId, identities.id))
        .where(and(eq(alumniBusinesses.tenantId, tenantId), eq(alumniBusinesses.industry, industry)))
        .orderBy(desc(alumniBusinesses.createdAt));
    }
    return await db
      .select({
        business: alumniBusinesses,
        owner: identities,
      })
      .from(alumniBusinesses)
      .leftJoin(identities, eq(alumniBusinesses.ownerIdentityId, identities.id))
      .where(eq(alumniBusinesses.tenantId, tenantId))
      .orderBy(desc(alumniBusinesses.createdAt));
  } catch (err) {
    console.error('Error fetching alumni businesses:', err);
    return [];
  }
}

export async function createAlumniBusiness(data: {
  tenantId: string;
  ownerIdentityId?: string;
  businessName: string;
  industry: string;
  description: string;
  website?: string;
  businessEmail: string;
  businessPhone?: string;
  address?: string;
  classSetId?: string;
}) {
  const id = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inserted = await db.insert(alumniBusinesses).values({
    id,
    tenantId: data.tenantId,
    ownerIdentityId: data.ownerIdentityId || null,
    businessName: data.businessName,
    industry: data.industry,
    description: data.description,
    website: data.website || null,
    businessEmail: data.businessEmail,
    businessPhone: data.businessPhone || null,
    address: data.address || null,
    verificationStatus: 'PENDING_VERIFICATION',
    classSetId: data.classSetId || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return inserted[0];
}

export async function getMentorshipPrograms(tenantId: string = 'tenant_ags_abeokuta') {
  try {
    await seedBaselineNetworkIfEmpty();
    const programs = await db
      .select()
      .from(mentorshipPrograms)
      .where(eq(mentorshipPrograms.tenantId, tenantId))
      .orderBy(desc(mentorshipPrograms.createdAt));

    const result = [];
    for (const prog of programs) {
      const pairs = await db
        .select()
        .from(mentorshipPairs)
        .where(eq(mentorshipPairs.programId, prog.id));
      result.push({ ...prog, pairsCount: pairs.length });
    }
    return result;
  } catch (err) {
    console.error('Error fetching mentorship programs:', err);
    return [];
  }
}

export async function createMentorshipPair(data: {
  programId: string;
  mentorIdentityId: string;
  menteeIdentityId: string;
  focusArea: string;
}) {
  const id = `mpair_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inserted = await db.insert(mentorshipPairs).values({
    id,
    programId: data.programId,
    mentorIdentityId: data.mentorIdentityId,
    menteeIdentityId: data.menteeIdentityId,
    focusArea: data.focusArea,
    status: 'PENDING_MATCH',
    createdAt: new Date(),
  }).returning();

  return inserted[0];
}

export async function getCareerOpportunities(tenantId: string = 'tenant_ags_abeokuta', employmentType?: string) {
  try {
    await seedBaselineNetworkIfEmpty();
    if (employmentType) {
      return await db
        .select()
        .from(careerOpportunities)
        .where(and(eq(careerOpportunities.tenantId, tenantId), eq(careerOpportunities.employmentType, employmentType)))
        .orderBy(desc(careerOpportunities.createdAt));
    }
    return await db
      .select()
      .from(careerOpportunities)
      .where(eq(careerOpportunities.tenantId, tenantId))
      .orderBy(desc(careerOpportunities.createdAt));
  } catch (err) {
    console.error('Error fetching career opportunities:', err);
    return [];
  }
}

export async function createCareerOpportunity(data: {
  tenantId: string;
  postedByIdentityId?: string;
  title: string;
  companyName: string;
  location: string;
  employmentType: string;
  description: string;
  applicationUrl?: string;
  contactEmail: string;
}) {
  const id = `copp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inserted = await db.insert(careerOpportunities).values({
    id,
    tenantId: data.tenantId,
    postedByIdentityId: data.postedByIdentityId || null,
    title: data.title,
    companyName: data.companyName,
    location: data.location,
    employmentType: data.employmentType || 'FULL_TIME',
    description: data.description,
    applicationUrl: data.applicationUrl || null,
    contactEmail: data.contactEmail,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return inserted[0];
}

export async function seedBaselineNetworkIfEmpty() {
  try {
    const existingBiz = await db.select().from(alumniBusinesses).limit(1);
    if (existingBiz.length > 0) return;

    const tenantId = 'tenant_ags_abeokuta';
    const now = new Date();

    // 1. Business 1
    await db.insert(alumniBusinesses).values({
      id: 'biz_baseline_01',
      tenantId,
      businessName: 'Egba FinTech Innovations Ltd',
      industry: 'Financial Technology',
      description: 'Leading digital payments and core banking infrastructure provider founded by AGS alumni.',
      website: 'https://egbafintech.example.com',
      businessEmail: 'contact@egbafintech.example.com',
      businessPhone: '+234 803 123 4567',
      address: 'Ibrahim Babangida Blvd, Abeokuta, Ogun State',
      verificationStatus: 'VERIFIED',
      createdAt: now,
      updatedAt: now,
    });

    // 2. Business 2
    await db.insert(alumniBusinesses).values({
      id: 'biz_baseline_02',
      tenantId,
      businessName: 'Ogun Valley Agro-Allied Enterprises',
      industry: 'Agriculture & Food Processing',
      description: 'Mechanized farming, grain processing, and agricultural export company across South-West Nigeria.',
      website: 'https://ogunvalleyagro.example.com',
      businessEmail: 'info@ogunvalleyagro.example.com',
      businessPhone: '+234 805 987 6543',
      address: 'Olabisi Onabanjo Way, Abeokuta',
      verificationStatus: 'VERIFIED',
      createdAt: now,
      updatedAt: now,
    });

    // 3. Mentorship Program
    const progId = 'mprog_baseline_2026';
    await db.insert(mentorshipPrograms).values({
      id: progId,
      tenantId,
      title: 'AGSOBA Global Mentorship & Career Guidance Scheme 2026',
      description: 'Connecting seasoned industry leaders, C-suite executives, and entrepreneurs with younger AGS alumni and senior students.',
      status: 'ACTIVE',
      createdAt: now,
    });

    // 4. Career Opportunity
    await db.insert(careerOpportunities).values({
      id: 'copp_baseline_01',
      tenantId,
      title: 'Senior Cloud Infrastructure Engineer',
      companyName: 'Egba FinTech Innovations Ltd',
      location: 'Lagos / Remote',
      employmentType: 'FULL_TIME',
      description: 'Seeking experienced cloud engineers with AWS/GCP and Kubernetes expertise to scale our pan-African financial switch.',
      applicationUrl: 'https://egbafintech.example.com/careers',
      contactEmail: 'careers@egbafintech.example.com',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    console.error('Error seeding baseline network data:', err);
  }
}

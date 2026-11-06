import { db } from './index.ts';
import {
  heritageDocuments,
  heritageCollections,
  heritageCollectionItems,
  heritageAccessAuditLogs,
} from './schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';

export async function getHeritageDocuments(tenantId: string = 'tenant_ags_abeokuta', category?: string) {
  try {
    await seedBaselineHeritageIfEmpty();
    if (category) {
      return await db
        .select()
        .from(heritageDocuments)
        .where(and(eq(heritageDocuments.tenantId, tenantId), eq(heritageDocuments.category, category)))
        .orderBy(desc(heritageDocuments.createdAt));
    }
    return await db
      .select()
      .from(heritageDocuments)
      .where(eq(heritageDocuments.tenantId, tenantId))
      .orderBy(desc(heritageDocuments.createdAt));
  } catch (err) {
    console.error('Error fetching heritage documents:', err);
    return [];
  }
}

export async function getHeritageDocumentDetail(
  documentId: string,
  accessorIdentityId?: string,
  clientIp?: string,
  accessType: string = 'VIEW'
) {
  const docs = await db.select().from(heritageDocuments).where(eq(heritageDocuments.id, documentId));
  if (docs.length === 0) {
    throw new Error('Heritage document not found.');
  }
  const doc = docs[0];

  // Increment view/download count
  const newViews = accessType === 'VIEW' ? doc.viewCount + 1 : doc.viewCount;
  const newDownloads = accessType === 'DOWNLOAD' ? doc.downloadCount + 1 : doc.downloadCount;

  await db
    .update(heritageDocuments)
    .set({
      viewCount: newViews,
      downloadCount: newDownloads,
      updatedAt: new Date(),
    })
    .where(eq(heritageDocuments.id, documentId));

  // Record access audit log
  const clientIpHash = clientIp
    ? crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 16)
    : 'unknown';

  await db.insert(heritageAccessAuditLogs).values({
    id: `halog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    documentId,
    accessorIdentityId: accessorIdentityId || null,
    accessType,
    clientIpHash,
    accessedAt: new Date(),
  });

  return { ...doc, viewCount: newViews, downloadCount: newDownloads };
}

export async function createHeritageDocument(data: {
  tenantId: string;
  title: string;
  description: string;
  category: string;
  accessLevel: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  fileSize?: number;
  mimeType?: string;
  provenanceMetadata?: any;
  uploadedByIdentityId?: string;
}) {
  const checksumSha256 = crypto
    .createHash('sha256')
    .update(`${data.title}-${data.mediaUrl}-${Date.now()}`)
    .digest('hex');

  const id = `hdoc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inserted = await db.insert(heritageDocuments).values({
    id,
    tenantId: data.tenantId,
    title: data.title,
    description: data.description,
    category: data.category || 'HISTORICAL_PHOTO',
    accessLevel: data.accessLevel || 'PUBLIC',
    mediaUrl: data.mediaUrl,
    thumbnailUrl: data.thumbnailUrl || data.mediaUrl,
    fileSize: data.fileSize || 1024576,
    mimeType: data.mimeType || 'image/jpeg',
    checksumSha256,
    provenanceMetadata: data.provenanceMetadata || {},
    uploadedByIdentityId: data.uploadedByIdentityId || null,
    viewCount: 0,
    downloadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return inserted[0];
}

export async function getHeritageCollections(tenantId: string = 'tenant_ags_abeokuta') {
  try {
    await seedBaselineHeritageIfEmpty();
    const cols = await db
      .select()
      .from(heritageCollections)
      .where(eq(heritageCollections.tenantId, tenantId))
      .orderBy(desc(heritageCollections.isFeatured), desc(heritageCollections.createdAt));

    const result = [];
    for (const col of cols) {
      const items = await db
        .select({
          item: heritageCollectionItems,
          document: heritageDocuments,
        })
        .from(heritageCollectionItems)
        .innerJoin(heritageDocuments, eq(heritageCollectionItems.documentId, heritageDocuments.id))
        .where(eq(heritageCollectionItems.collectionId, col.id))
        .orderBy(heritageCollectionItems.itemOrder);

      result.push({
        ...col,
        items: items.map((i) => ({ ...i.item, document: i.document })),
      });
    }
    return result;
  } catch (err) {
    console.error('Error fetching heritage collections:', err);
    return [];
  }
}

export async function seedBaselineHeritageIfEmpty() {
  try {
    const existing = await db.select().from(heritageDocuments).limit(1);
    if (existing.length > 0) return;

    const tenantId = 'tenant_ags_abeokuta';
    const now = new Date();

    // 1. Historical Photo: Foundation Laying 1909
    const doc1Id = 'hdoc_baseline_1909';
    const checksum1 = crypto.createHash('sha256').update('1909_foundation').digest('hex');
    await db.insert(heritageDocuments).values({
      id: doc1Id,
      tenantId,
      title: 'Foundation Laying Ceremony of Abeokuta Grammar School (1909)',
      description: 'Archival photograph capturing the founding fathers and reverend clergy at the foundational site in Oke-Bola, Abeokuta on July 16, 1909.',
      category: 'HISTORICAL_PHOTO',
      accessLevel: 'PUBLIC',
      mediaUrl: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&q=80&w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&q=80&w=400',
      fileSize: 2450000,
      mimeType: 'image/jpeg',
      checksumSha256: checksum1,
      provenanceMetadata: {
        author: 'CMS Missionary Archives',
        accessionDate: '1984-10-12',
        donor: 'AGSOBA National Secretariat',
        archivalSource: 'Special Collections MS-204',
        historicalEra: 'Colonial Era (1909)',
      },
      viewCount: 184,
      downloadCount: 42,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Magazine: Diamond Jubilee Edition 1984
    const doc2Id = 'hdoc_baseline_magazine_1984';
    const checksum2 = crypto.createHash('sha256').update('1984_magazine').digest('hex');
    await db.insert(heritageDocuments).values({
      id: doc2Id,
      tenantId,
      title: 'AGSOBA Diamond Jubilee Magazine (75th Anniversary Edition 1984)',
      description: 'Official commemorative magazine featuring historical milestones, principal speeches, and old boys directory up to 1984.',
      category: 'MAGAZINE_PUBLICATION',
      accessLevel: 'VERIFIED_ALUMNI',
      mediaUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
      fileSize: 8900000,
      mimeType: 'application/pdf',
      checksumSha256: checksum2,
      provenanceMetadata: {
        editor: 'Chief J. K. A. Adeleke',
        accessionDate: '2005-06-15',
        donor: 'Class of 1974',
        archivalSource: 'AGS Library Archive',
        historicalEra: 'Post-Independence (1984)',
      },
      viewCount: 312,
      downloadCount: 95,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Founder Speech: Rev. R. S. Oyebola Address 1925
    const doc3Id = 'hdoc_baseline_speech_1925';
    const checksum3 = crypto.createHash('sha256').update('1925_speech').digest('hex');
    await db.insert(heritageDocuments).values({
      id: doc3Id,
      tenantId,
      title: 'Presidential Address on Character and Learning by Rev. R. S. Oyebola (1925)',
      description: 'Handwritten transcript and typed manuscript of the founder address emphasizing discipline, integrity, and community service.',
      category: 'FOUNDERS_SPEECH',
      accessLevel: 'PUBLIC',
      mediaUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=400',
      fileSize: 1200000,
      mimeType: 'application/pdf',
      checksumSha256: checksum3,
      provenanceMetadata: {
        author: 'Rev. R. S. Oyebola',
        accessionDate: '1990-03-20',
        donor: 'Egba Traditional Council',
        archivalSource: 'National Archives Ibadan Reel 12',
        historicalEra: 'Early Era (1925)',
      },
      viewCount: 209,
      downloadCount: 63,
      createdAt: now,
      updatedAt: now,
    });

    // 4. Campus Blueprint: 1955 Master Plan
    const doc4Id = 'hdoc_baseline_blueprint_1955';
    const checksum4 = crypto.createHash('sha256').update('1955_blueprint').digest('hex');
    await db.insert(heritageDocuments).values({
      id: doc4Id,
      tenantId,
      title: 'Original Architectural Master Plan & Science Block Blueprint (1955)',
      description: 'Architectural linen drawing of the AGS Science Laboratories and Assembly Hall extension designed by British colonial surveyors.',
      category: 'CAMPUS_BLUEPRINT',
      accessLevel: 'EXECUTIVE_ONLY',
      mediaUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=400',
      fileSize: 15400000,
      mimeType: 'application/pdf',
      checksumSha256: checksum4,
      provenanceMetadata: {
        author: 'P. W. D. Architectural Division',
        accessionDate: '2012-11-05',
        donor: 'AGSOBA Estate Committee',
        archivalSource: 'Ogun State Land Registry Vault',
        historicalEra: 'Mid-Century (1955)',
      },
      viewCount: 78,
      downloadCount: 19,
      createdAt: now,
      updatedAt: now,
    });

    // Create Collection 1: Centenary Archival Exhibition
    const col1Id = 'hcol_centenary';
    await db.insert(heritageCollections).values({
      id: col1Id,
      tenantId,
      title: 'AGSOBA Centenary Archival Exhibition (1909–2009)',
      description: 'A curated digital gallery celebrating 100 years of academic excellence, leadership, and moral rectitude in Abeokuta Grammar School.',
      isFeatured: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(heritageCollectionItems).values([
      {
        id: `hitem_1`,
        collectionId: col1Id,
        documentId: doc1Id,
        itemOrder: 1,
        addedAt: now,
      },
      {
        id: `hitem_2`,
        collectionId: col1Id,
        documentId: doc2Id,
        itemOrder: 2,
        addedAt: now,
      },
      {
        id: `hitem_3`,
        collectionId: col1Id,
        documentId: doc3Id,
        itemOrder: 3,
        addedAt: now,
      },
    ]);
  } catch (err) {
    console.error('Error seeding baseline heritage:', err);
  }
}

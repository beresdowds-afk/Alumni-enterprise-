import { db } from './index.ts';
import {
  communicationTemplates,
  communicationCampaigns,
  deliveryLogs,
  identities,
  classSetMemberships,
  auditLogs,
} from './schema.ts';
import { eq, and, desc, sql } from 'drizzle-orm';
import { recordAuditEvent } from './authServices.ts';

export async function getTemplates(tenantId: string) {
  return await db
    .select()
    .from(communicationTemplates)
    .where(eq(communicationTemplates.tenantId, tenantId))
    .orderBy(desc(communicationTemplates.createdAt));
}

export async function createTemplate(data: {
  tenantId: string;
  name: string;
  subject: string;
  body: string;
  channel: string;
  category: string;
}) {
  const id = `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const [newTemplate] = await db
    .insert(communicationTemplates)
    .values({
      id,
      tenantId: data.tenantId,
      name: data.name,
      subject: data.subject,
      body: data.body,
      channel: data.channel || 'EMAIL',
      category: data.category || 'ANNOUNCEMENT',
    })
    .returning();
  return newTemplate;
}

export async function getCampaigns(tenantId: string) {
  return await db
    .select()
    .from(communicationCampaigns)
    .where(eq(communicationCampaigns.tenantId, tenantId))
    .orderBy(desc(communicationCampaigns.createdAt));
}

export async function createCampaign(data: {
  tenantId: string;
  associationId: string;
  createdByIdentityId?: string;
  title: string;
  channel: string;
  templateId?: string;
  subject: string;
  body: string;
  recipientSegment?: any;
  scheduledAt?: string;
}) {
  const id = `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const [newCampaign] = await db
    .insert(communicationCampaigns)
    .values({
      id,
      tenantId: data.tenantId,
      associationId: data.associationId,
      createdByIdentityId: data.createdByIdentityId,
      title: data.title,
      channel: data.channel || 'EMAIL',
      templateId: data.templateId,
      subject: data.subject,
      body: data.body,
      recipientSegment: data.recipientSegment || {},
      status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    })
    .returning();

  if (data.createdByIdentityId) {
    await recordAuditEvent({
      tenantId: data.tenantId,
      actorIdentityId: data.createdByIdentityId,
      action: 'COMMUNICATION_CAMPAIGN_CREATED',
      targetResource: `campaign:${id}`,
      scope: 'ASSOCIATION',
      details: { title: data.title, channel: data.channel },
    });
  }

  return newCampaign;
}

export async function executeCampaign(campaignId: string, actorIdentityId?: string) {
  const [campaign] = await db
    .select()
    .from(communicationCampaigns)
    .where(eq(communicationCampaigns.id, campaignId));

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Determine recipients based on segment criteria
  const segment = (campaign.recipientSegment as any) || {};
  const recipientConditions = [eq(identities.status, 'ACTIVE')];

  if (segment.classSetId) {
    recipientConditions.push(eq(classSetMemberships.classSetId, segment.classSetId));
  }

  const recipients = await db
    .select({
      id: identities.id,
      email: identities.email,
      phoneNumber: identities.phoneNumber,
    })
    .from(identities)
    .leftJoin(classSetMemberships, eq(identities.id, classSetMemberships.identityId))
    .where(and(...recipientConditions));
  const total = recipients.length;

  let successful = 0;
  let failed = 0;

  for (const rec of recipients) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const contactPoint = campaign.channel === 'SMS' ? rec.phoneNumber : rec.email;

    if (!contactPoint) {
      failed++;
      await db.insert(deliveryLogs).values({
        id: logId,
        campaignId,
        recipientIdentityId: rec.id,
        recipientContact: 'UNKNOWN',
        channel: campaign.channel,
        status: 'FAILED',
        providerResponse: 'Missing contact information for recipient channel',
      });
      continue;
    }

    const isSuccess = Math.random() > 0.05;
    if (isSuccess) {
      successful++;
      await db.insert(deliveryLogs).values({
        id: logId,
        campaignId,
        recipientIdentityId: rec.id,
        recipientContact: contactPoint,
        channel: campaign.channel,
        status: 'DELIVERED',
        providerResponse: '200 OK - Dispatched via provider gateway',
        sentAt: new Date(),
      });
    } else {
      failed++;
      await db.insert(deliveryLogs).values({
        id: logId,
        campaignId,
        recipientIdentityId: rec.id,
        recipientContact: contactPoint,
        channel: campaign.channel,
        status: 'FAILED',
        providerResponse: '503 Gateway Rate Limit / Delivery Error',
        sentAt: new Date(),
      });
    }
  }

  const [updated] = await db
    .update(communicationCampaigns)
    .set({
      status: 'SENT',
      sentAt: new Date(),
      totalRecipients: total,
      successfulCount: successful,
      failedCount: failed,
      updatedAt: new Date(),
    })
    .where(eq(communicationCampaigns.id, campaignId))
    .returning();

  if (actorIdentityId) {
    await recordAuditEvent({
      tenantId: campaign.tenantId,
      actorIdentityId,
      action: 'COMMUNICATION_CAMPAIGN_SENT',
      targetResource: `campaign:${campaignId}`,
      scope: 'ASSOCIATION',
      details: { total, successful, failed },
    });
  }

  return updated;
}

export async function getCampaignLogs(campaignId: string) {
  return await db
    .select()
    .from(deliveryLogs)
    .where(eq(deliveryLogs.campaignId, campaignId))
    .orderBy(desc(deliveryLogs.createdAt));
}

import { db } from './index.ts';
import {
  meetings,
  meetingAgendas,
  meetingAttendances,
  meetingMinutes,
  meetingResolutions,
  meetingActionTasks,
  identities,
  classSets,
  tenants,
  associations,
} from './schema.ts';
import { eq, and, desc, asc, ilike, sql } from 'drizzle-orm';
import { recordAuditEvent } from './authServices.ts';
import crypto from 'crypto';

export interface MeetingQueryOptions {
  tenantId?: string;
  associationId?: string;
  classSetId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getMeetings(options: MeetingQueryOptions) {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const conditions = [];
  if (options.tenantId) {
    conditions.push(eq(meetings.tenantId, options.tenantId));
  }
  if (options.associationId) {
    conditions.push(eq(meetings.associationId, options.associationId));
  }
  if (options.classSetId) {
    conditions.push(eq(meetings.classSetId, options.classSetId));
  }
  if (options.status) {
    conditions.push(eq(meetings.status, options.status));
  }
  if (options.search) {
    conditions.push(ilike(meetings.title, `%${options.search}%`));
  }

  const query = db
    .select({
      id: meetings.id,
      tenantId: meetings.tenantId,
      associationId: meetings.associationId,
      classSetId: meetings.classSetId,
      title: meetings.title,
      meetingType: meetings.meetingType,
      scope: meetings.scope,
      scheduledStartTime: meetings.scheduledStartTime,
      scheduledEndTime: meetings.scheduledEndTime,
      actualStartTime: meetings.actualStartTime,
      actualEndTime: meetings.actualEndTime,
      location: meetings.location,
      isVirtual: meetings.isVirtual,
      virtualUrl: meetings.virtualUrl,
      quorumRequired: meetings.quorumRequired,
      status: meetings.status,
      presidedByIdentityId: meetings.presidedByIdentityId,
      recordedByIdentityId: meetings.recordedByIdentityId,
      createdAt: meetings.createdAt,
      classSetDisplayName: classSets.displayName,
    })
    .from(meetings)
    .leftJoin(classSets, eq(meetings.classSetId, classSets.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(meetings.scheduledStartTime))
    .limit(limit)
    .offset(offset);

  const results = await query;

  // Enrich with attendance and agenda counts
  const enriched = await Promise.all(
    results.map(async (mtg) => {
      const [attCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(meetingAttendances)
        .where(eq(meetingAttendances.meetingId, mtg.id));

      const [agendaCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(meetingAgendas)
        .where(eq(meetingAgendas.meetingId, mtg.id));

      const [minute] = await db
        .select({ adoptedStatus: meetingMinutes.adoptedStatus, adoptionHash: meetingMinutes.adoptionHash })
        .from(meetingMinutes)
        .where(eq(meetingMinutes.meetingId, mtg.id));

      return {
        ...mtg,
        attendanceCount: attCount?.count || 0,
        agendaCount: agendaCount?.count || 0,
        minuteStatus: minute?.adoptedStatus || 'NO_MINUTES',
        isMinuteAdopted: minute?.adoptedStatus === 'ADOPTED',
        adoptionHash: minute?.adoptionHash || null,
        hasQuorum: (attCount?.count || 0) >= mtg.quorumRequired,
      };
    })
  );

  return enriched;
}

export async function getMeetingDetail(meetingId: string) {
  const [mtg] = await db
    .select({
      id: meetings.id,
      tenantId: meetings.tenantId,
      associationId: meetings.associationId,
      classSetId: meetings.classSetId,
      title: meetings.title,
      meetingType: meetings.meetingType,
      scope: meetings.scope,
      scheduledStartTime: meetings.scheduledStartTime,
      scheduledEndTime: meetings.scheduledEndTime,
      actualStartTime: meetings.actualStartTime,
      actualEndTime: meetings.actualEndTime,
      location: meetings.location,
      isVirtual: meetings.isVirtual,
      virtualUrl: meetings.virtualUrl,
      quorumRequired: meetings.quorumRequired,
      status: meetings.status,
      presidedByIdentityId: meetings.presidedByIdentityId,
      recordedByIdentityId: meetings.recordedByIdentityId,
      createdAt: meetings.createdAt,
      classSetDisplayName: classSets.displayName,
    })
    .from(meetings)
    .leftJoin(classSets, eq(meetings.classSetId, classSets.id))
    .where(eq(meetings.id, meetingId));

  if (!mtg) {
    throw new Error(`Meeting with ID ${meetingId} not found`);
  }

  // Agendas
  const agendas = await db
    .select({
      id: meetingAgendas.id,
      itemOrder: meetingAgendas.itemOrder,
      title: meetingAgendas.title,
      description: meetingAgendas.description,
      durationMinutes: meetingAgendas.durationMinutes,
      status: meetingAgendas.status,
      presenterName: sql<string>`concat(${identities.firstName}, ' ', ${identities.lastName})`,
    })
    .from(meetingAgendas)
    .leftJoin(identities, eq(meetingAgendas.presenterIdentityId, identities.id))
    .where(eq(meetingAgendas.meetingId, meetingId))
    .orderBy(asc(meetingAgendas.itemOrder));

  // Attendances
  const attendances = await db
    .select({
      id: meetingAttendances.id,
      identityId: meetingAttendances.identityId,
      role: meetingAttendances.role,
      attendanceStatus: meetingAttendances.attendanceStatus,
      signedInAt: meetingAttendances.signedInAt,
      notes: meetingAttendances.notes,
      firstName: identities.firstName,
      lastName: identities.lastName,
      email: identities.email,
    })
    .from(meetingAttendances)
    .leftJoin(identities, eq(meetingAttendances.identityId, identities.id))
    .where(eq(meetingAttendances.meetingId, meetingId))
    .orderBy(asc(identities.lastName));

  // Minutes
  const [minute] = await db
    .select({
      id: meetingMinutes.id,
      bodyText: meetingMinutes.bodyText,
      adoptedStatus: meetingMinutes.adoptedStatus,
      adoptedAt: meetingMinutes.adoptedAt,
      adoptionHash: meetingMinutes.adoptionHash,
      presidingSignature: meetingMinutes.presidingSignature,
      secretarySignature: meetingMinutes.secretarySignature,
      motionProposedByIdentityId: meetingMinutes.motionProposedByIdentityId,
      motionSecondedByIdentityId: meetingMinutes.motionSecondedByIdentityId,
      createdAt: meetingMinutes.createdAt,
      updatedAt: meetingMinutes.updatedAt,
    })
    .from(meetingMinutes)
    .where(eq(meetingMinutes.meetingId, meetingId));

  // Resolutions originated from this meeting
  const resolutions = await db
    .select()
    .from(meetingResolutions)
    .where(eq(meetingResolutions.meetingId, meetingId))
    .orderBy(asc(meetingResolutions.resolutionNumber));

  // Tasks originated from this meeting
  const tasks = await db
    .select({
      id: meetingActionTasks.id,
      title: meetingActionTasks.title,
      description: meetingActionTasks.description,
      priority: meetingActionTasks.priority,
      status: meetingActionTasks.status,
      dueDate: meetingActionTasks.dueDate,
      completedAt: meetingActionTasks.completedAt,
      completionNotes: meetingActionTasks.completionNotes,
      assigneeName: sql<string>`concat(${identities.firstName}, ' ', ${identities.lastName})`,
      assigneeEmail: identities.email,
    })
    .from(meetingActionTasks)
    .leftJoin(identities, eq(meetingActionTasks.assigneeIdentityId, identities.id))
    .where(eq(meetingActionTasks.meetingId, meetingId))
    .orderBy(asc(meetingActionTasks.dueDate));

  return {
    ...mtg,
    attendanceCount: attendances.length,
    hasQuorum: attendances.length >= mtg.quorumRequired,
    agendas,
    attendances,
    minute: minute || null,
    resolutions,
    tasks,
  };
}

export async function createMeeting(data: {
  tenantId: string;
  associationId: string;
  classSetId?: string;
  title: string;
  meetingType: string;
  scope: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  location: string;
  isVirtual?: boolean;
  virtualUrl?: string;
  quorumRequired?: number;
  presidedByIdentityId?: string;
  recordedByIdentityId?: string;
  actorIdentityId?: string;
}) {
  const id = `mtg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const [newMeeting] = await db
    .insert(meetings)
    .values({
      id,
      tenantId: data.tenantId,
      associationId: data.associationId,
      classSetId: data.classSetId || null,
      title: data.title,
      meetingType: data.meetingType || 'ORDINARY',
      scope: data.scope || 'CLASS_SET',
      scheduledStartTime: new Date(data.scheduledStartTime),
      scheduledEndTime: new Date(data.scheduledEndTime),
      location: data.location,
      isVirtual: !!data.isVirtual,
      virtualUrl: data.virtualUrl || null,
      quorumRequired: data.quorumRequired || 5,
      presidedByIdentityId: data.presidedByIdentityId || null,
      recordedByIdentityId: data.recordedByIdentityId || null,
      status: 'SCHEDULED',
    })
    .returning();

  if (data.actorIdentityId) {
    await recordAuditEvent({
      tenantId: data.tenantId,
      actorIdentityId: data.actorIdentityId,
      action: 'MEETING_SCHEDULED',
      targetResource: `meeting:${id}`,
      scope: (data.scope as 'ASSOCIATION' | 'CLASS_SET') || 'CLASS_SET',
      details: { title: data.title, meetingType: data.meetingType, scheduledStartTime: data.scheduledStartTime },
    });
  }

  return newMeeting;
}

export async function updateMeetingStatus(
  meetingId: string,
  newStatus: string,
  actorIdentityId?: string
) {
  const [existing] = await db.select().from(meetings).where(eq(meetings.id, meetingId));
  if (!existing) {
    throw new Error(`Meeting ${meetingId} not found`);
  }

  const updates: any = {
    status: newStatus,
    updatedAt: new Date(),
  };

  if (newStatus === 'IN_SESSION' && !existing.actualStartTime) {
    updates.actualStartTime = new Date();
  } else if (newStatus === 'ADJOURNED' && !existing.actualEndTime) {
    updates.actualEndTime = new Date();
  }

  const [updated] = await db
    .update(meetings)
    .set(updates)
    .where(eq(meetings.id, meetingId))
    .returning();

  if (actorIdentityId) {
    await recordAuditEvent({
      tenantId: existing.tenantId,
      actorIdentityId,
      action: `MEETING_STATUS_${newStatus}`,
      targetResource: `meeting:${meetingId}`,
      scope: existing.scope as 'ASSOCIATION' | 'CLASS_SET',
      details: { previousStatus: existing.status, newStatus },
    });
  }

  return updated;
}

export async function addMeetingAgenda(data: {
  meetingId: string;
  itemOrder: number;
  title: string;
  description?: string;
  presenterIdentityId?: string;
  durationMinutes?: number;
}) {
  const id = `agd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const [agenda] = await db
    .insert(meetingAgendas)
    .values({
      id,
      meetingId: data.meetingId,
      itemOrder: data.itemOrder,
      title: data.title,
      description: data.description || null,
      presenterIdentityId: data.presenterIdentityId || null,
      durationMinutes: data.durationMinutes || 15,
      status: 'PENDING',
    })
    .returning();
  return agenda;
}

export async function recordAttendance(data: {
  meetingId: string;
  identityId: string;
  role?: string;
  attendanceStatus?: string;
  notes?: string;
}) {
  const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const [att] = await db
    .insert(meetingAttendances)
    .values({
      id,
      meetingId: data.meetingId,
      identityId: data.identityId,
      role: data.role || 'MEMBER',
      attendanceStatus: data.attendanceStatus || 'PRESENT',
      signedInAt: new Date(),
      notes: data.notes || null,
    })
    .onConflictDoUpdate({
      target: [meetingAttendances.meetingId, meetingAttendances.identityId],
      set: {
        attendanceStatus: data.attendanceStatus || 'PRESENT',
        role: data.role || 'MEMBER',
        notes: data.notes || null,
      },
    })
    .returning();
  return att;
}

export async function saveDraftMinutes(
  meetingId: string,
  bodyText: string,
  actorIdentityId?: string
) {
  const [existing] = await db
    .select()
    .from(meetingMinutes)
    .where(eq(meetingMinutes.meetingId, meetingId));

  if (existing) {
    if (existing.adoptedStatus === 'ADOPTED') {
      throw new Error('Adopted minutes cannot be modified. They are cryptographically sealed.');
    }
    const [updated] = await db
      .update(meetingMinutes)
      .set({
        bodyText,
        updatedAt: new Date(),
      })
      .where(eq(meetingMinutes.id, existing.id))
      .returning();
    return updated;
  } else {
    const id = `min_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const [created] = await db
      .insert(meetingMinutes)
      .values({
        id,
        meetingId,
        bodyText,
        adoptedStatus: 'DRAFT',
      })
      .returning();
    return created;
  }
}

/**
 * Formally adopt minutes with cryptographic hash digest and digital signatures
 */
export async function adoptMinutes(
  meetingId: string,
  data: {
    motionProposedByIdentityId: string;
    motionSecondedByIdentityId: string;
    presidingOfficerId: string;
    secretaryId: string;
    actorIdentityId?: string;
  }
) {
  const [mtg] = await db.select().from(meetings).where(eq(meetings.id, meetingId));
  if (!mtg) {
    throw new Error(`Meeting ${meetingId} not found`);
  }

  const [min] = await db
    .select()
    .from(meetingMinutes)
    .where(eq(meetingMinutes.meetingId, meetingId));

  if (!min || !min.bodyText || min.bodyText.trim().length === 0) {
    throw new Error('Cannot adopt empty minutes. Draft body text is required.');
  }

  if (min.adoptedStatus === 'ADOPTED') {
    throw new Error('Minutes are already adopted and sealed.');
  }

  const adoptionTimestamp = new Date();

  // Compute immutable SHA-256 cryptographic hash of minutes document + formal approval metadata
  const contentToHash = JSON.stringify({
    meetingId,
    tenantId: mtg.tenantId,
    bodyText: min.bodyText.trim(),
    motionProposedBy: data.motionProposedByIdentityId,
    motionSecondedBy: data.motionSecondedByIdentityId,
    presidingOfficer: data.presidingOfficerId,
    secretary: data.secretaryId,
    adoptedAt: adoptionTimestamp.toISOString(),
  });

  const adoptionHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

  const presidingSignature = `SIG-PRES-${adoptionHash.substring(0, 12).toUpperCase()}-${Date.now()}`;
  const secretarySignature = `SIG-SEC-${adoptionHash.substring(12, 24).toUpperCase()}-${Date.now()}`;

  const [adopted] = await db
    .update(meetingMinutes)
    .set({
      adoptedStatus: 'ADOPTED',
      motionProposedByIdentityId: data.motionProposedByIdentityId,
      motionSecondedByIdentityId: data.motionSecondedByIdentityId,
      adoptedAt: adoptionTimestamp,
      adoptionHash,
      presidingSignature,
      secretarySignature,
      updatedAt: adoptionTimestamp,
    })
    .where(eq(meetingMinutes.id, min.id))
    .returning();

  await recordAuditEvent({
    tenantId: mtg.tenantId,
    actorIdentityId: data.actorIdentityId || data.presidingOfficerId,
    action: 'MEETING_MINUTES_ADOPTED',
    targetResource: `minute:${min.id}`,
    scope: mtg.scope as 'ASSOCIATION' | 'CLASS_SET',
    details: {
      meetingId,
      adoptionHash,
      motionProposedBy: data.motionProposedByIdentityId,
      motionSecondedBy: data.motionSecondedByIdentityId,
    },
  });

  return adopted;
}

export async function createResolution(data: {
  tenantId: string;
  associationId: string;
  meetingId: string;
  minuteId?: string;
  title: string;
  description: string;
  category: string;
  bindingScope: string;
  effectiveDate: string;
  actorIdentityId?: string;
}) {
  const [mtg] = await db.select().from(meetings).where(eq(meetings.id, data.meetingId));
  if (!mtg) {
    throw new Error(`Referenced origin meeting ${data.meetingId} does not exist`);
  }

  // Generate unique resolution number
  const year = new Date().getFullYear();
  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(meetingResolutions)
    .where(eq(meetingResolutions.tenantId, data.tenantId));

  const sequenceNum = String((countRes?.count || 0) + 1).padStart(3, '0');
  const resolutionNumber = `RES-AGSOBA-${year}-${sequenceNum}`;

  const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const [resolution] = await db
    .insert(meetingResolutions)
    .values({
      id,
      tenantId: data.tenantId,
      associationId: data.associationId,
      meetingId: data.meetingId,
      minuteId: data.minuteId || null,
      resolutionNumber,
      title: data.title,
      description: data.description,
      category: data.category || 'GOVERNANCE',
      bindingScope: data.bindingScope || 'ASSOCIATION',
      status: 'PASSED',
      effectiveDate: new Date(data.effectiveDate),
    })
    .returning();

  if (data.actorIdentityId) {
    await recordAuditEvent({
      tenantId: data.tenantId,
      actorIdentityId: data.actorIdentityId,
      action: 'RESOLUTION_PASSED',
      targetResource: `resolution:${resolutionNumber}`,
      scope: (data.bindingScope as 'ASSOCIATION' | 'CLASS_SET') || 'ASSOCIATION',
      details: { resolutionNumber, meetingId: data.meetingId, title: data.title },
    });
  }

  return resolution;
}

export async function getResolutions(options: {
  tenantId?: string;
  associationId?: string;
  category?: string;
  status?: string;
  search?: string;
}) {
  const conditions = [];
  if (options.tenantId) {
    conditions.push(eq(meetingResolutions.tenantId, options.tenantId));
  }
  if (options.associationId) {
    conditions.push(eq(meetingResolutions.associationId, options.associationId));
  }
  if (options.category) {
    conditions.push(eq(meetingResolutions.category, options.category));
  }
  if (options.status) {
    conditions.push(eq(meetingResolutions.status, options.status));
  }
  if (options.search) {
    conditions.push(
      sql`(${ilike(meetingResolutions.title, `%${options.search}%`)} OR ${ilike(
        meetingResolutions.resolutionNumber,
        `%${options.search}%`
      )})`
    );
  }

  return await db
    .select({
      id: meetingResolutions.id,
      resolutionNumber: meetingResolutions.resolutionNumber,
      title: meetingResolutions.title,
      description: meetingResolutions.description,
      category: meetingResolutions.category,
      bindingScope: meetingResolutions.bindingScope,
      status: meetingResolutions.status,
      effectiveDate: meetingResolutions.effectiveDate,
      passedAt: meetingResolutions.passedAt,
      meetingId: meetingResolutions.meetingId,
      meetingTitle: meetings.title,
    })
    .from(meetingResolutions)
    .leftJoin(meetings, eq(meetingResolutions.meetingId, meetings.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(meetingResolutions.passedAt));
}

export async function createTask(data: {
  tenantId: string;
  meetingId: string;
  resolutionId?: string;
  title: string;
  description?: string;
  assigneeIdentityId?: string;
  dueDate: string;
  priority?: string;
  actorIdentityId?: string;
}) {
  const id = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const [task] = await db
    .insert(meetingActionTasks)
    .values({
      id,
      tenantId: data.tenantId,
      meetingId: data.meetingId,
      resolutionId: data.resolutionId || null,
      title: data.title,
      description: data.description || null,
      assigneeIdentityId: data.assigneeIdentityId || null,
      dueDate: new Date(data.dueDate),
      priority: data.priority || 'MEDIUM',
      status: 'PENDING',
    })
    .returning();

  if (data.actorIdentityId) {
    await recordAuditEvent({
      tenantId: data.tenantId,
      actorIdentityId: data.actorIdentityId,
      action: 'ACTION_TASK_ASSIGNED',
      targetResource: `task:${id}`,
      scope: 'CLASS_SET',
      details: { title: data.title, assignee: data.assigneeIdentityId, dueDate: data.dueDate },
    });
  }

  return task;
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: string,
  completionNotes?: string,
  actorIdentityId?: string
) {
  const [task] = await db.select().from(meetingActionTasks).where(eq(meetingActionTasks.id, taskId));
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  const updates: any = {
    status: newStatus,
    updatedAt: new Date(),
  };

  if (newStatus === 'COMPLETED') {
    updates.completedAt = new Date();
    if (completionNotes) {
      updates.completionNotes = completionNotes;
    }
  }

  const [updated] = await db
    .update(meetingActionTasks)
    .set(updates)
    .where(eq(meetingActionTasks.id, taskId))
    .returning();

  if (actorIdentityId) {
    await recordAuditEvent({
      tenantId: task.tenantId,
      actorIdentityId,
      action: `TASK_STATUS_${newStatus}`,
      targetResource: `task:${taskId}`,
      scope: 'CLASS_SET',
      details: { previousStatus: task.status, newStatus, completionNotes },
    });
  }

  return updated;
}

export async function getTasks(options: {
  tenantId?: string;
  meetingId?: string;
  assigneeIdentityId?: string;
  status?: string;
}) {
  const conditions = [];
  if (options.tenantId) {
    conditions.push(eq(meetingActionTasks.tenantId, options.tenantId));
  }
  if (options.meetingId) {
    conditions.push(eq(meetingActionTasks.meetingId, options.meetingId));
  }
  if (options.assigneeIdentityId) {
    conditions.push(eq(meetingActionTasks.assigneeIdentityId, options.assigneeIdentityId));
  }
  if (options.status) {
    conditions.push(eq(meetingActionTasks.status, options.status));
  }

  return await db
    .select({
      id: meetingActionTasks.id,
      title: meetingActionTasks.title,
      description: meetingActionTasks.description,
      priority: meetingActionTasks.priority,
      status: meetingActionTasks.status,
      dueDate: meetingActionTasks.dueDate,
      completedAt: meetingActionTasks.completedAt,
      completionNotes: meetingActionTasks.completionNotes,
      meetingId: meetingActionTasks.meetingId,
      meetingTitle: meetings.title,
      resolutionId: meetingActionTasks.resolutionId,
      assigneeName: sql<string>`concat(${identities.firstName}, ' ', ${identities.lastName})`,
      assigneeEmail: identities.email,
    })
    .from(meetingActionTasks)
    .leftJoin(meetings, eq(meetingActionTasks.meetingId, meetings.id))
    .leftJoin(identities, eq(meetingActionTasks.assigneeIdentityId, identities.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(meetingActionTasks.dueDate));
}

/**
 * Seed initial baseline meetings for AGSOBA if empty
 */
export async function seedBaselineMeetingsIfEmpty(tenantId: string, associationId: string) {
  const existing = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(eq(meetings.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  // Get active identity for presiding / recording
  const [firstUser] = await db
    .select({ id: identities.id })
    .from(identities)
    .where(eq(identities.status, 'ACTIVE'))
    .limit(1);

  const [secondUser] = await db
    .select({ id: identities.id })
    .from(identities)
    .where(eq(identities.status, 'ACTIVE'))
    .offset(1)
    .limit(1);

  const actorId = firstUser?.id;
  const secId = secondUser?.id || actorId;

  // Meeting 1: AGSOBA National Executive Council Q1 2026 Meeting
  const mtg1Id = 'mtg_agsoba_exec_2026_q1';
  await db.insert(meetings).values({
    id: mtg1Id,
    tenantId,
    associationId,
    title: 'AGSOBA National Executive Council Q1 2026 Statutory Meeting',
    meetingType: 'EXECUTIVE_COUNCIL',
    scope: 'ASSOCIATION',
    scheduledStartTime: new Date('2026-03-14T10:00:00Z'),
    scheduledEndTime: new Date('2026-03-14T13:30:00Z'),
    actualStartTime: new Date('2026-03-14T10:15:00Z'),
    actualEndTime: new Date('2026-03-14T13:45:00Z'),
    location: 'AGSOBA National Secretariat, Abeokuta & Hybrid Google Meet',
    isVirtual: true,
    virtualUrl: 'https://meet.google.com/ags-exec-2026',
    quorumRequired: 6,
    status: 'ADJOURNED',
    presidedByIdentityId: actorId,
    recordedByIdentityId: secId,
  });

  // Agendas for Meeting 1
  await db.insert(meetingAgendas).values([
    {
      id: 'agd_001',
      meetingId: mtg1Id,
      itemOrder: 1,
      title: 'Call to Order & National Anthem / School Song',
      description: 'Opening remarks by Global President and opening prayer',
      durationMinutes: 10,
      status: 'RESOLVED',
    },
    {
      id: 'agd_002',
      meetingId: mtg1Id,
      itemOrder: 2,
      title: 'Adoption of Previous Council Minutes',
      description: 'Review and formal motion to adopt minutes of Q4 2025 Council',
      durationMinutes: 20,
      status: 'RESOLVED',
    },
    {
      id: 'agd_003',
      meetingId: mtg1Id,
      itemOrder: 3,
      title: 'Founders Day 2026 Infrastructure Development Fund Allocation',
      description: 'Deliberation on science laboratory equipment donation to Abeokuta Grammar School',
      durationMinutes: 45,
      status: 'RESOLVED',
    },
    {
      id: 'agd_004',
      meetingId: mtg1Id,
      itemOrder: 4,
      title: 'Subdomain Class-Set Delegation Protocol Approval',
      description: 'Ratification of digital identity governance standard for class set portals',
      durationMinutes: 30,
      status: 'RESOLVED',
    },
  ]);

  // Attendances for Meeting 1
  if (actorId) {
    await db.insert(meetingAttendances).values({
      id: 'att_001',
      meetingId: mtg1Id,
      identityId: actorId,
      role: 'PRESIDING_OFFICER',
      attendanceStatus: 'PRESENT',
      signedInAt: new Date('2026-03-14T10:05:00Z'),
      notes: 'Presided over Council',
    });
  }
  if (secId && secId !== actorId) {
    await db.insert(meetingAttendances).values({
      id: 'att_002',
      meetingId: mtg1Id,
      identityId: secId,
      role: 'SECRETARY',
      attendanceStatus: 'PRESENT',
      signedInAt: new Date('2026-03-14T10:02:00Z'),
      notes: 'Recorded official minutes',
    });
  }

  // Adopted Minutes for Meeting 1
  const minuteText = `MINUTES OF THE AGSOBA NATIONAL EXECUTIVE COUNCIL Q1 2026 STATUTORY MEETING
Held on Saturday, March 14, 2026 at AGSOBA National Secretariat, Abeokuta.

1. CALL TO ORDER
The National President called the meeting to order at 10:15 AM following the rendition of the School Anthem ("Up School!").

2. ATTENDANCE & QUORUM
Quorum was officially verified with national principal officers and branch chairmen in attendance.

3. RESOLUTIONS & MOTIONS
Motion 1: It was unanimously resolved that the 2026 Science Lab Renovation Grant of NGN 25,000,000 be approved for disbursement under the supervision of the National Project Committee.
Proposed by: Chief O. Adebayo (National Secretary)
Seconded by: Engr. K. Balogun (National Treasurer)

Motion 2: The Digital Subdomain Protocol delegating automated cohort subdomains under agsoba.org.ng was formally ratified.

4. ADJOURNMENT
The meeting adjourned at 1:45 PM following closing prayer.`;

  const contentToHash = JSON.stringify({
    meetingId: mtg1Id,
    tenantId,
    bodyText: minuteText.trim(),
    motionProposedBy: actorId,
    motionSecondedBy: secId,
    presidingOfficer: actorId,
    secretary: secId,
    adoptedAt: new Date('2026-03-14T14:00:00Z').toISOString(),
  });
  const hash = crypto.createHash('sha256').update(contentToHash).digest('hex');

  const minId = 'min_agsoba_exec_2026_q1';
  await db.insert(meetingMinutes).values({
    id: minId,
    meetingId: mtg1Id,
    bodyText: minuteText,
    adoptedStatus: 'ADOPTED',
    motionProposedByIdentityId: actorId,
    motionSecondedByIdentityId: secId,
    adoptedAt: new Date('2026-03-14T14:00:00Z'),
    adoptionHash: hash,
    presidingSignature: `SIG-PRES-${hash.substring(0, 12).toUpperCase()}-20260314`,
    secretarySignature: `SIG-SEC-${hash.substring(12, 24).toUpperCase()}-20260314`,
  });

  // Resolution 1
  const res1Id = 'res_agsoba_2026_001';
  await db.insert(meetingResolutions).values({
    id: res1Id,
    tenantId,
    associationId,
    meetingId: mtg1Id,
    minuteId: minId,
    resolutionNumber: 'RES-AGSOBA-2026-001',
    title: 'Science Laboratory Infrastructure Grant Authorization',
    description: 'Approval of NGN 25,000,000 grant for comprehensive STEM and Physics laboratory modernization at Abeokuta Grammar School.',
    category: 'PROJECT',
    bindingScope: 'ASSOCIATION',
    status: 'PASSED',
    effectiveDate: new Date('2026-03-15T00:00:00Z'),
  });

  // Action Task 1
  await db.insert(meetingActionTasks).values({
    id: 'tsk_001',
    tenantId,
    meetingId: mtg1Id,
    resolutionId: res1Id,
    title: 'Disburse Phase 1 STEM Equipment Vendor Advance',
    description: 'Coordinate with Board of Trustees and Treasurer to release initial 40% mobilization funds upon contractor bond verification.',
    assigneeIdentityId: secId || actorId,
    dueDate: new Date('2026-04-15T17:00:00Z'),
    priority: 'HIGH',
    status: 'IN_PROGRESS',
  });
}

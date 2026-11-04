import { db } from './index.ts';
import {
  events,
  eventTicketTiers,
  eventRegistrations,
  eventAttendances,
  eventReconciliations,
  eventGalleryItems,
  identities,
  auditLogs,
  tenants,
  associations,
  classSets,
} from './schema.ts';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Helper to compute cryptographic SHA-256 seal
 */
export function generateSha256Seal(payload: string): string {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Generate cryptographic ticket badge token
 */
export function generateQrBadgeToken(eventYear: number = new Date().getFullYear()): string {
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `AGS-EVT-${eventYear}-${randomSuffix}`;
}

/**
 * List events with live computed metrics (registrations count, capacity left)
 */
export async function getEvents(tenantId: string = 'tenant_ags_abeokuta', options: { classSetId?: string; status?: string } = {}) {
  const conditions = [eq(events.tenantId, tenantId)];
  if (options.classSetId) {
    conditions.push(eq(events.classSetId, options.classSetId));
  }
  if (options.status) {
    conditions.push(eq(events.status, options.status));
  }

  const eventList = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.startDate));

  // Augment with tier counts and registration numbers
  const augmented = await Promise.all(
    eventList.map(async (ev) => {
      const tiers = await db
        .select()
        .from(eventTicketTiers)
        .where(eq(eventTicketTiers.eventId, ev.id));

      const regCountRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(eventRegistrations)
        .where(and(eq(eventRegistrations.eventId, ev.id), eq(eventRegistrations.registrationStatus, 'CONFIRMED')));
      
      const totalRegistered = Number(regCountRes[0]?.count || 0);

      const attCountRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(eventAttendances)
        .where(eq(eventAttendances.eventId, ev.id));
      
      const totalCheckedIn = Number(attCountRes[0]?.count || 0);

      const isDeadlinePassed = new Date() > new Date(ev.registrationDeadline);
      const isCapacityReached = totalRegistered >= ev.capacityLimit;

      return {
        ...ev,
        tiers,
        totalRegistered,
        totalCheckedIn,
        capacityRemaining: Math.max(0, ev.capacityLimit - totalRegistered),
        isDeadlinePassed,
        isCapacityReached,
      };
    })
  );

  return augmented;
}

/**
 * Get detailed event record including ticket tiers, registrations, attendances, and gallery
 */
export async function getEventDetail(eventId: string) {
  const [eventRecord] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

  if (!eventRecord) {
    return null;
  }

  const tiers = await db
    .select()
    .from(eventTicketTiers)
    .where(eq(eventTicketTiers.eventId, eventId))
    .orderBy(eventTicketTiers.price);

  const registrations = await db
    .select({
      id: eventRegistrations.id,
      eventId: eventRegistrations.eventId,
      identityId: eventRegistrations.identityId,
      ticketTierId: eventRegistrations.ticketTierId,
      guestCount: eventRegistrations.guestCount,
      guestNames: eventRegistrations.guestNames,
      registrationStatus: eventRegistrations.registrationStatus,
      qrBadgeToken: eventRegistrations.qrBadgeToken,
      qrBadgeHash: eventRegistrations.qrBadgeHash,
      dietaryRequirements: eventRegistrations.dietaryRequirements,
      specialAssistance: eventRegistrations.specialAssistance,
      totalAmount: eventRegistrations.totalAmount,
      paymentReference: eventRegistrations.paymentReference,
      registeredAt: eventRegistrations.registeredAt,
      identity: {
        id: identities.id,
        firstName: identities.firstName,
        lastName: identities.lastName,
        email: identities.email,
        phoneNumber: identities.phoneNumber,
      },
    })
    .from(eventRegistrations)
    .leftJoin(identities, eq(eventRegistrations.identityId, identities.id))
    .where(eq(eventRegistrations.eventId, eventId))
    .orderBy(desc(eventRegistrations.registeredAt));

  const attendances = await db
    .select({
      id: eventAttendances.id,
      eventId: eventAttendances.eventId,
      registrationId: eventAttendances.registrationId,
      identityId: eventAttendances.identityId,
      attendeeType: eventAttendances.attendeeType,
      guestName: eventAttendances.guestName,
      checkedInByIdentityId: eventAttendances.checkedInByIdentityId,
      checkInTimestamp: eventAttendances.checkInTimestamp,
      checkInMethod: eventAttendances.checkInMethod,
      checkpointLocation: eventAttendances.checkpointLocation,
      badgeIssued: eventAttendances.badgeIssued,
      notes: eventAttendances.notes,
      identity: {
        id: identities.id,
        firstName: identities.firstName,
        lastName: identities.lastName,
        email: identities.email,
      },
    })
    .from(eventAttendances)
    .leftJoin(identities, eq(eventAttendances.identityId, identities.id))
    .where(eq(eventAttendances.eventId, eventId))
    .orderBy(desc(eventAttendances.checkInTimestamp));

  const [reconciliation] = await db
    .select()
    .from(eventReconciliations)
    .where(eq(eventReconciliations.eventId, eventId));

  const galleryItems = await db
    .select()
    .from(eventGalleryItems)
    .where(eq(eventGalleryItems.eventId, eventId))
    .orderBy(desc(eventGalleryItems.createdAt));

  const totalRegistered = registrations.filter((r) => r.registrationStatus === 'CONFIRMED').length;
  const totalCheckedIn = attendances.length;

  return {
    ...eventRecord,
    tiers,
    registrations,
    attendances,
    reconciliation: reconciliation || null,
    galleryItems,
    stats: {
      capacityLimit: eventRecord.capacityLimit,
      totalRegistered,
      totalCheckedIn,
      capacityRemaining: Math.max(0, eventRecord.capacityLimit - totalRegistered),
      noShows: Math.max(0, totalRegistered - totalCheckedIn),
      turnoutRate: totalRegistered > 0 ? ((totalCheckedIn / totalRegistered) * 100).toFixed(1) + '%' : '0.0%',
      isDeadlinePassed: new Date() > new Date(eventRecord.registrationDeadline),
      isCapacityReached: totalRegistered >= eventRecord.capacityLimit,
    },
  };
}

/**
 * Create a new Event with server validation
 */
export async function createEvent(data: {
  tenantId?: string;
  associationId?: string;
  classSetId?: string | null;
  title: string;
  description: string;
  eventType?: string;
  scope?: string;
  venue: string;
  isVirtual?: boolean;
  virtualUrl?: string | null;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  capacityLimit?: number;
  bannerImageUrl?: string | null;
  createdByIdentityId?: string | null;
}) {
  if (!data.title || data.title.trim().length === 0) {
    throw new Error('Event title is required.');
  }
  if (!data.venue || data.venue.trim().length === 0) {
    throw new Error('Event venue is required.');
  }
  if (data.endDate <= data.startDate) {
    throw new Error('Event end date must be after start date.');
  }
  if (data.registrationDeadline > data.endDate) {
    throw new Error('Registration deadline cannot be after the event end date.');
  }

  const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tenantId = data.tenantId || 'tenant_ags_abeokuta';
  const associationId = data.associationId || 'asc_agsoba_01';
  const capacityLimit = data.capacityLimit || 500;

  const [created] = await db
    .insert(events)
    .values({
      id,
      tenantId,
      associationId,
      classSetId: data.classSetId || null,
      title: data.title.trim(),
      description: data.description.trim(),
      eventType: data.eventType || 'REUNION',
      scope: data.scope || 'ASSOCIATION',
      venue: data.venue.trim(),
      isVirtual: Boolean(data.isVirtual),
      virtualUrl: data.virtualUrl || null,
      startDate: data.startDate,
      endDate: data.endDate,
      registrationDeadline: data.registrationDeadline,
      capacityLimit,
      bannerImageUrl: data.bannerImageUrl || null,
      status: 'PUBLISHED',
      createdByIdentityId: data.createdByIdentityId || null,
    })
    .returning();

  return created;
}

/**
 * Add a Ticket Tier to an event
 */
export async function createTicketTier(data: {
  eventId: string;
  name: string;
  description?: string | null;
  price?: number;
  currency?: string;
  tierCapacity?: number;
  maxPerMember?: number;
  isGuestAllowed?: boolean;
}) {
  const id = `tier_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const [tier] = await db
    .insert(eventTicketTiers)
    .values({
      id,
      eventId: data.eventId,
      name: data.name.trim(),
      description: data.description || null,
      price: data.price !== undefined ? data.price : 0,
      currency: data.currency || 'NGN',
      tierCapacity: data.tierCapacity || 100,
      soldCount: 0,
      maxPerMember: data.maxPerMember || 2,
      isGuestAllowed: data.isGuestAllowed !== undefined ? data.isGuestAllowed : true,
      status: 'ACTIVE',
    })
    .returning();

  return tier;
}

/**
 * Register Member for Event
 * STRICT SERVER-SIDE VALIDATION:
 * 1. Registration deadline strictly enforced.
 * 2. Event overall capacity strictly enforced.
 * 3. Ticket tier capacity strictly enforced.
 * 4. Distinct registration record created with cryptographic QR badge token.
 * 5. Does NOT create attendance record (attendance is distinct and happens at gate check-in).
 */
export async function registerForEvent(params: {
  eventId: string;
  identityId: string;
  ticketTierId: string;
  guestCount?: number;
  guestNames?: string[];
  dietaryRequirements?: string | null;
  specialAssistance?: string | null;
  paymentReference?: string | null;
  allowHistoricalBypass?: boolean;
}) {
  // 1. Fetch Event
  const [ev] = await db
    .select()
    .from(events)
    .where(eq(events.id, params.eventId));

  if (!ev) {
    throw new Error(`Event not found: ${params.eventId}`);
  }

  // 2. Check Event Status & 3. SERVER-AUTHORITATIVE DEADLINE ENFORCEMENT
  const now = new Date();
  if (!params.allowHistoricalBypass) {
    if (!['PUBLISHED', 'REGISTRATION_OPEN'].includes(ev.status)) {
      throw new Error(`Event is not open for registration. Current status: ${ev.status}`);
    }

    if (now > new Date(ev.registrationDeadline)) {
      throw new Error(
        `Registration deadline passed on ${new Date(ev.registrationDeadline).toLocaleDateString()} at ${new Date(ev.registrationDeadline).toLocaleTimeString()}. Server rejected late submission.`
      );
    }
  }

  // 4. Fetch Ticket Tier
  const [tier] = await db
    .select()
    .from(eventTicketTiers)
    .where(and(eq(eventTicketTiers.id, params.ticketTierId), eq(eventTicketTiers.eventId, params.eventId)));

  if (!tier) {
    throw new Error(`Ticket tier not found or not associated with this event.`);
  }

  const guests = params.guestNames || [];
  const guestCount = Math.max(0, params.guestCount !== undefined ? params.guestCount : guests.length);
  const totalSlotsRequested = 1 + guestCount;

  // Check member guest permission
  if (guestCount > 0 && !tier.isGuestAllowed) {
    throw new Error(`Guest passes are not permitted on the ${tier.name} ticket tier.`);
  }
  if (totalSlotsRequested > tier.maxPerMember) {
    throw new Error(`Exceeded maximum limit of ${tier.maxPerMember} tickets/passes per member on this tier.`);
  }

  // 5. SERVER-AUTHORITATIVE OVERALL EVENT CAPACITY ENFORCEMENT
  const regCountRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, params.eventId), eq(eventRegistrations.registrationStatus, 'CONFIRMED')));

  const currentEventRegistrations = Number(regCountRes[0]?.count || 0);
  if (currentEventRegistrations + 1 > ev.capacityLimit) {
    throw new Error(
      `Event capacity limit reached. Maximum venue capacity is ${ev.capacityLimit}. Current confirmed registrations: ${currentEventRegistrations}. Server rejected registration.`
    );
  }

  // 6. SERVER-AUTHORITATIVE TIER CAPACITY ENFORCEMENT
  if (tier.soldCount + 1 > tier.tierCapacity) {
    throw new Error(
      `Selected tier "${tier.name}" is completely sold out. Tier capacity: ${tier.tierCapacity}, sold: ${tier.soldCount}. Please choose an alternative ticket tier.`
    );
  }

  // 7. Check if member is already registered for this event
  const [existingReg] = await db
    .select()
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, params.eventId),
        eq(eventRegistrations.identityId, params.identityId),
        eq(eventRegistrations.registrationStatus, 'CONFIRMED')
      )
    );

  if (existingReg) {
    throw new Error(`Alumnus is already registered for this event with QR badge token ${existingReg.qrBadgeToken}. Duplicate registrations are prohibited.`);
  }

  // 8. Generate Cryptographic QR Badge Token & SHA-256 Seal
  const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const qrBadgeToken = generateQrBadgeToken(new Date(ev.startDate).getFullYear());
  const qrBadgeHash = generateSha256Seal(`${regId}:${params.eventId}:${params.identityId}:${qrBadgeToken}`);
  const totalAmount = tier.price * totalSlotsRequested;

  // 9. Persist Registration
  const [registration] = await db
    .insert(eventRegistrations)
    .values({
      id: regId,
      eventId: params.eventId,
      identityId: params.identityId,
      ticketTierId: params.ticketTierId,
      guestCount,
      guestNames: guests,
      registrationStatus: 'CONFIRMED',
      qrBadgeToken,
      qrBadgeHash,
      dietaryRequirements: params.dietaryRequirements || null,
      specialAssistance: params.specialAssistance || null,
      totalAmount,
      paymentReference: params.paymentReference || `PAY-EVT-${Date.now()}`,
      registeredAt: now,
    })
    .returning();

  // Increment sold count on tier
  await db
    .update(eventTicketTiers)
    .set({ soldCount: tier.soldCount + 1 })
    .where(eq(eventTicketTiers.id, tier.id));

  // Audit event
  await db.insert(auditLogs).values({
    id: `aud_reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenantId: ev.tenantId || 'tenant_ags_abeokuta',
    actorIdentityId: params.identityId,
    action: 'EVENT_REGISTRATION_COMPLETED',
    targetResource: registration.id,
    scope: 'ASSOCIATION',
    details: {
      eventId: params.eventId,
      tierName: tier.name,
      qrBadgeToken,
      totalAmount,
      guestCount,
    },
  });

  return {
    success: true,
    message: 'Event registration confirmed. Digital QR badge issued.',
    registration,
    tier,
  };
}

/**
 * Validate QR Badge & Gate Check-In
 * STRICT CHECK-IN INTEGRITY:
 * 1. Look up registration by badge token.
 * 2. Validate cryptographic badge seal.
 * 3. Detect duplicate entry attempts (anti-passback / anti-fraud).
 * 4. Create distinct attendance record.
 */
export async function validateBadgeAndCheckIn(params: {
  eventId: string;
  qrBadgeToken: string;
  checkedByIdentityId?: string | null;
  checkpointLocation?: string;
  attendeeType?: 'ALUMNUS' | 'GUEST';
  guestName?: string | null;
  checkInMethod?: string;
}) {
  const token = params.qrBadgeToken.trim().toUpperCase();
  const attendeeType = params.attendeeType || 'ALUMNUS';
  const checkpoint = params.checkpointLocation || 'Main Entrance Gate Protocol Desk';
  const checkInMethod = params.checkInMethod || 'QR_SCAN';

  // 1. Find Registration
  const [reg] = await db
    .select({
      id: eventRegistrations.id,
      eventId: eventRegistrations.eventId,
      identityId: eventRegistrations.identityId,
      ticketTierId: eventRegistrations.ticketTierId,
      guestCount: eventRegistrations.guestCount,
      guestNames: eventRegistrations.guestNames,
      registrationStatus: eventRegistrations.registrationStatus,
      qrBadgeToken: eventRegistrations.qrBadgeToken,
      qrBadgeHash: eventRegistrations.qrBadgeHash,
      identity: {
        id: identities.id,
        firstName: identities.firstName,
        lastName: identities.lastName,
        email: identities.email,
        phoneNumber: identities.phoneNumber,
      },
      tier: {
        id: eventTicketTiers.id,
        name: eventTicketTiers.name,
        price: eventTicketTiers.price,
      },
    })
    .from(eventRegistrations)
    .leftJoin(identities, eq(eventRegistrations.identityId, identities.id))
    .leftJoin(eventTicketTiers, eq(eventRegistrations.ticketTierId, eventTicketTiers.id))
    .where(eq(eventRegistrations.qrBadgeToken, token));

  if (!reg) {
    return {
      success: false,
      code: 'BADGE_NOT_FOUND',
      message: `Invalid badge token: ${token}. No matching registration in the central event roster.`,
    };
  }

  if (reg.eventId !== params.eventId) {
    return {
      success: false,
      code: 'EVENT_MISMATCH',
      message: `Badge token belongs to a different event. Access denied.`,
    };
  }

  if (reg.registrationStatus !== 'CONFIRMED') {
    return {
      success: false,
      code: 'INVALID_STATUS',
      message: `Registration status is "${reg.registrationStatus}". Badge cannot be admitted.`,
    };
  }

  // 2. Validate Cryptographic Hash Seal
  const expectedHash = generateSha256Seal(`${reg.id}:${reg.eventId}:${reg.identityId}:${reg.qrBadgeToken}`);
  if (reg.qrBadgeHash !== expectedHash) {
    return {
      success: false,
      code: 'TAMPER_DETECTED',
      message: `Cryptographic badge hash mismatch! Security seal corrupted or forged. Access denied.`,
    };
  }

  // 3. Anti-Duplicate Check-in Validation (Anti-Passback)
  const existingAttendances = await db
    .select()
    .from(eventAttendances)
    .where(
      and(
        eq(eventAttendances.eventId, params.eventId),
        eq(eventAttendances.registrationId, reg.id)
      )
    );

  if (attendeeType === 'ALUMNUS') {
    const alumnusCheckIn = existingAttendances.find((a) => a.attendeeType === 'ALUMNUS');
    if (alumnusCheckIn) {
      return {
        success: false,
        code: 'ALREADY_CHECKED_IN',
        message: `DUPLICATE ENTRY DETECTED! Alumnus has already been admitted at ${new Date(alumnusCheckIn.checkInTimestamp).toLocaleTimeString()} via ${alumnusCheckIn.checkpointLocation}.`,
        priorAttendance: alumnusCheckIn,
        registration: reg,
      };
    }
  } else {
    // Guest check-in
    const guestCheckIns = existingAttendances.filter((a) => a.attendeeType === 'GUEST');
    if (guestCheckIns.length >= reg.guestCount) {
      return {
        success: false,
        code: 'GUEST_LIMIT_REACHED',
        message: `All ${reg.guestCount} allowable guest passes for this badge have already been checked in.`,
        priorAttendances: guestCheckIns,
        registration: reg,
      };
    }
  }

  // 4. Create Distinct Attendance Record
  const attId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const [attendance] = await db
    .insert(eventAttendances)
    .values({
      id: attId,
      eventId: params.eventId,
      registrationId: reg.id,
      identityId: attendeeType === 'ALUMNUS' ? reg.identityId : null,
      attendeeType,
      guestName: params.guestName || (attendeeType === 'GUEST' ? `Guest of ${reg.identity?.firstName} ${reg.identity?.lastName}` : null),
      checkedInByIdentityId: params.checkedByIdentityId || null,
      checkInTimestamp: new Date(),
      checkInMethod,
      checkpointLocation: checkpoint,
      badgeIssued: true,
      notes: `Admitted at ${checkpoint} via ${checkInMethod}`,
    })
    .returning();

  // Audit event
  await db.insert(auditLogs).values({
    id: `aud_att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenantId: 'tenant_ags_abeokuta',
    actorIdentityId: params.checkedByIdentityId || reg.identityId,
    action: 'EVENT_CHECK_IN_VALIDATED',
    targetResource: attendance.id,
    scope: 'ASSOCIATION',
    details: {
      eventId: params.eventId,
      registrationId: reg.id,
      attendeeType,
      checkpoint,
      qrBadgeToken: token,
    },
  });

  return {
    success: true,
    code: 'CHECK_IN_SUCCESS',
    message: `Entry validated. Welcome ${attendeeType === 'ALUMNUS' ? `${reg.identity?.firstName} ${reg.identity?.lastName}` : params.guestName || 'Guest'}!`,
    attendance,
    registration: reg,
  };
}

/**
 * Reconcile Event Attendance & Produce Statutory Certification
 */
export async function reconcileEventAttendance(params: {
  eventId: string;
  reconciledByIdentityId?: string | null;
  reconciliationNotes?: string | null;
}) {
  const [ev] = await db
    .select()
    .from(events)
    .where(eq(events.id, params.eventId));

  if (!ev) {
    throw new Error(`Event not found: ${params.eventId}`);
  }

  const registrations = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, params.eventId), eq(eventRegistrations.registrationStatus, 'CONFIRMED')));

  const attendances = await db
    .select()
    .from(eventAttendances)
    .where(eq(eventAttendances.eventId, params.eventId));

  const tiers = await db
    .select()
    .from(eventTicketTiers)
    .where(eq(eventTicketTiers.eventId, params.eventId));

  const totalCapacity = ev.capacityLimit;
  const totalRegistrations = registrations.length;
  const totalCheckedIn = attendances.length;
  const totalNoShows = Math.max(0, totalRegistrations - totalCheckedIn);
  const turnoutRate = totalRegistrations > 0 ? ((totalCheckedIn / totalRegistrations) * 100).toFixed(1) + '%' : '0.0%';

  // Breakdown per tier
  const tierBreakdown: Record<string, { name: string; capacity: number; registered: number; checkedIn: number; noShows: number; revenueKobo: number }> = {};
  for (const t of tiers) {
    const tierRegs = registrations.filter((r) => r.ticketTierId === t.id);
    const regIds = new Set(tierRegs.map((r) => r.id));
    const tierAtts = attendances.filter((a) => regIds.has(a.registrationId));
    const revenue = tierRegs.reduce((acc, r) => acc + r.totalAmount, 0);

    tierBreakdown[t.id] = {
      name: t.name,
      capacity: t.tierCapacity,
      registered: tierRegs.length,
      checkedIn: tierAtts.length,
      noShows: Math.max(0, tierRegs.length - tierAtts.length),
      revenueKobo: revenue,
    };
  }

  const now = new Date();
  const sealPayload = `${params.eventId}:${totalCapacity}:${totalRegistrations}:${totalCheckedIn}:${turnoutRate}:${now.toISOString()}`;
  const reconciliationSeal = generateSha256Seal(sealPayload);

  const [existingRec] = await db
    .select()
    .from(eventReconciliations)
    .where(eq(eventReconciliations.eventId, params.eventId));

  let reconciliationRecord;
  if (existingRec) {
    const [updated] = await db
      .update(eventReconciliations)
      .set({
        reconciledByIdentityId: params.reconciledByIdentityId || null,
        totalCapacity,
        totalRegistrations,
        totalCheckedIn,
        totalNoShows,
        turnoutRate,
        tierBreakdownJson: tierBreakdown,
        reconciliationNotes: params.reconciliationNotes || 'Official post-event reconciliation certification updated.',
        reconciliationSeal,
        reconciledAt: now,
      })
      .where(eq(eventReconciliations.id, existingRec.id))
      .returning();
    reconciliationRecord = updated;
  } else {
    const [created] = await db
      .insert(eventReconciliations)
      .values({
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        eventId: params.eventId,
        reconciledByIdentityId: params.reconciledByIdentityId || null,
        totalCapacity,
        totalRegistrations,
        totalCheckedIn,
        totalNoShows,
        turnoutRate,
        tierBreakdownJson: tierBreakdown,
        reconciliationNotes: params.reconciliationNotes || 'Official post-event reconciliation certification established.',
        reconciliationSeal,
        reconciledAt: now,
      })
      .returning();
    reconciliationRecord = created;
  }

  // Audit
  await db.insert(auditLogs).values({
    id: `aud_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenantId: ev.tenantId || 'tenant_ags_abeokuta',
    actorIdentityId: params.reconciledByIdentityId || null,
    action: 'EVENT_RECONCILIATION_CERTIFIED',
    targetResource: reconciliationRecord.id,
    scope: 'ASSOCIATION',
    details: {
      eventId: params.eventId,
      totalCapacity,
      totalRegistrations,
      totalCheckedIn,
      turnoutRate,
      reconciliationSeal,
    },
  });

  return {
    success: true,
    message: 'Post-event attendance reconciliation certified with cryptographic seal.',
    reconciliation: reconciliationRecord,
  };
}

/**
 * Add Gallery item for Post-Event Memorial Archive
 */
export async function addGalleryItem(data: {
  eventId: string;
  mediaUrl: string;
  caption: string;
  category?: string;
  takenYear?: number;
  uploadedByIdentityId?: string | null;
}) {
  const id = `gal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const [item] = await db
    .insert(eventGalleryItems)
    .values({
      id,
      eventId: data.eventId,
      uploadedByIdentityId: data.uploadedByIdentityId || null,
      mediaUrl: data.mediaUrl,
      caption: data.caption,
      category: data.category || 'REUNION_MOMENTS',
      takenYear: data.takenYear || new Date().getFullYear(),
    })
    .returning();

  return item;
}

/**
 * Baseline Seeder: Seeds realistic AGSOBA Reunions & Events if table is empty
 */
export async function seedBaselineEventsIfEmpty() {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(events);
  if (Number(existing[0]?.count || 0) > 0) {
    return;
  }

  console.log('Seeding baseline AGSOBA Events and Reunion records...');

  // Identify AGSOBA tenant & sample identities
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, 'tenant_ags_abeokuta')).limit(1);
  const [assoc] = await db.select().from(associations).where(eq(associations.acronym, 'AGSOBA')).limit(1);
  const allIdentities = await db.select().from(identities).limit(6);

  if (!tenant || !assoc || allIdentities.length === 0) {
    console.log('Cannot seed events: missing AGSOBA tenant or identities.');
    return;
  }

  const plannerIdentity = allIdentities[0];
  const attendeeIdentities = allIdentities.slice(1);

  // 1. Flagship Event: AGSOBA 2025 Global Reunion & 102nd Founder's Day Dinner
  const event1StartDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
  const event1EndDate = new Date(event1StartDate.getTime() + 4 * 60 * 60 * 1000);
  const event1Deadline = new Date(event1StartDate.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days before

  const event1 = await createEvent({
    tenantId: tenant.id,
    associationId: assoc.id,
    title: 'AGSOBA 2025 Global Reunion & 102nd Founder’s Day Gala Dinner',
    description: 'The premier annual gathering of all Abeokuta Grammar School Old Boys worldwide. Featuring the State of the Alma Mater address, grand hall banquet, distinguished merit awards, and the induction of senior anniversary class sets.',
    eventType: 'REUNION',
    scope: 'ASSOCIATION',
    venue: 'Lisabi Hall & Quadrangle, Abeokuta Grammar School, Idi-Aba, Abeokuta, Ogun State',
    isVirtual: false,
    startDate: event1StartDate,
    endDate: event1EndDate,
    registrationDeadline: event1Deadline,
    capacityLimit: 350,
    createdByIdentityId: plannerIdentity.id,
  });

  // Tiers for Event 1
  const tier1Early = await createTicketTier({
    eventId: event1.id,
    name: 'Early Bird Alumnus',
    description: 'General admission for individual alumnus including commemorative program and 3-course dinner banquet.',
    price: 1500000, // N15,000 in kobo
    tierCapacity: 120,
    maxPerMember: 2,
    isGuestAllowed: true,
  });

  const tier1VIP = await createTicketTier({
    eventId: event1.id,
    name: 'VIP Patron & Merit Award Table',
    description: 'Priority front-row seating, dedicated protocol usher, vintage champagne toast, and special mention in Founder’s Day gazette.',
    price: 5000000, // N50,000 in kobo
    tierCapacity: 50,
    maxPerMember: 2,
    isGuestAllowed: true,
  });

  const tier1Spouse = await createTicketTier({
    eventId: event1.id,
    name: 'Spouse / Companion Pass',
    description: 'Accompaniment pass for registered member’s spouse or partner.',
    price: 1000000, // N10,000 in kobo
    tierCapacity: 80,
    maxPerMember: 1,
    isGuestAllowed: false,
  });

  // 2. Concluded Event: AGSOBA 2024 Founder’s Day & Heritage Colloquium (For Reconciliation Verification)
  const pastStartDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
  const pastEndDate = new Date(pastStartDate.getTime() + 6 * 60 * 60 * 1000);
  const pastDeadline = new Date(pastStartDate.getTime() - 3 * 24 * 60 * 60 * 1000);

  const event2 = await createEvent({
    tenantId: tenant.id,
    associationId: assoc.id,
    title: 'AGSOBA 2024 Centennial Heritage Colloquium & Class Set Assembly',
    description: 'Commemorative colloquium celebrating secondary education excellence in Western Nigeria, school archival exhibition, and statutory class set council meeting.',
    eventType: 'CONFERENCE',
    scope: 'ASSOCIATION',
    venue: 'Centenary Hall & J.K. Coker Memorial Auditorium, Abeokuta, Ogun State',
    isVirtual: true,
    virtualUrl: 'https://meet.google.com/ags-heritage-colloquium',
    startDate: pastStartDate,
    endDate: pastEndDate,
    registrationDeadline: pastDeadline,
    capacityLimit: 250,
    createdByIdentityId: plannerIdentity.id,
  });

  await db.update(events).set({ status: 'CONCLUDED' }).where(eq(events.id, event2.id));

  const tier2Standard = await createTicketTier({
    eventId: event2.id,
    name: 'Standard Colloquium Delegate',
    description: 'Full delegate accreditation, colloquium pack, and luncheon buffet.',
    price: 1000000,
    tierCapacity: 150,
    maxPerMember: 2,
    isGuestAllowed: true,
  });

  // Register some attendees for event 2 to test reconciliation & distinct check-ins
  for (let i = 0; i < Math.min(3, attendeeIdentities.length); i++) {
    const member = attendeeIdentities[i];
    const regResult = await registerForEvent({
      eventId: event2.id,
      identityId: member.id,
      ticketTierId: tier2Standard.id,
      guestCount: i === 0 ? 1 : 0,
      guestNames: i === 0 ? ['Mrs. Funmilayo Olagunju'] : [],
      dietaryRequirements: 'Halal / Vegetarian preferred',
      allowHistoricalBypass: true,
    });

    // Check in the first 2 attendees to demonstrate distinct check-in vs 1 no-show!
    if (i < 2) {
      await validateBadgeAndCheckIn({
        eventId: event2.id,
        qrBadgeToken: regResult.registration.qrBadgeToken,
        checkedByIdentityId: plannerIdentity.id,
        checkpointLocation: 'Centenary Hall Protocol Gate',
      });
    }
  }

  // Pre-seed official reconciliation for Event 2
  await reconcileEventAttendance({
    eventId: event2.id,
    reconciledByIdentityId: plannerIdentity.id,
    reconciliationNotes: 'Statutory reconciliation confirmed by AGSOBA Protocol & Welfare Committee. All badges audited against physical check-in registers.',
  });

  // Pre-seed gallery items
  await addGalleryItem({
    eventId: event2.id,
    mediaUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    caption: '1984-1989 Class Set banner presentation at the Centenary Hall podium.',
    category: 'CLASS_PHOTO',
    takenYear: 2024,
    uploadedByIdentityId: plannerIdentity.id,
  });

  await addGalleryItem({
    eventId: event2.id,
    mediaUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    caption: 'Alumni choir performing the venerable School Anthem during opening devotions.',
    category: 'CEREMONY',
    takenYear: 2024,
    uploadedByIdentityId: plannerIdentity.id,
  });

  console.log('✓ AGSOBA Events baseline seeding complete.');
}

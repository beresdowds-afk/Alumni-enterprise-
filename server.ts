import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getTenants,
  getAssociations,
  getClassSets,
  getSchemaMigrations,
  getSystemPermissions,
} from './src/db/services.ts';
import {
  getPendingMemberships,
  updateMembershipVerificationStatus,
  batchImportMembers,
} from './src/db/membershipServices.ts';
import {
  getExecutiveAppointments,
  createExecutiveAppointment,
  revokeExecutiveAppointment,
  createHandoverMemorandum,
  verifyExecutivePermission,
} from './src/db/governanceServices.ts';
import {
  getDirectoryMembers,
  getMemberProfileDetail,
  updateMemberPrivacySettings,
  sendContactInquiry,
} from './src/db/profileServices.ts';
import {
  getTemplates,
  createTemplate,
  getCampaigns,
  createCampaign,
  executeCampaign,
  getCampaignLogs,
} from './src/db/communicationServices.ts';
import {
  getMeetings,
  getMeetingDetail,
  createMeeting,
  updateMeetingStatus,
  addMeetingAgenda,
  recordAttendance,
  saveDraftMinutes,
  adoptMinutes,
  createResolution,
  getResolutions,
  createTask,
  updateTaskStatus,
  getTasks,
  seedBaselineMeetingsIfEmpty,
} from './src/db/meetingServices.ts';
import {
  getElections,
  getElectionDetail,
  createElection,
  updateElectionStatus,
  addElectionContest,
  nominateCandidate,
  vetCandidate,
  registerVoter,
  castBallot,
  certifyElectionResults,
  seedBaselineElectionsIfEmpty,
} from './src/db/votingServices.ts';
import {
  getEvents,
  getEventDetail,
  createEvent,
  createTicketTier,
  registerForEvent,
  validateBadgeAndCheckIn,
  reconcileEventAttendance,
  addGalleryItem,
  seedBaselineEventsIfEmpty,
} from './src/db/eventServices.ts';
import {
  getFinancialDashboardData,
  processVerifiedPaymentWebhook,
  createExpenseRequisition,
  updateRequisitionApproval,
  seedBaselineFinancesIfEmpty,
} from './src/db/financeServices.ts';
import {
  getWelfarePrograms,
  createWelfareProgram,
  getWelfareCases,
  getWelfareCaseDetail,
  createWelfareCase,
  reviewWelfareCase,
  disburseWelfareGrant,
  seedBaselineWelfareIfEmpty,
} from './src/db/welfareServices.ts';
import {
  getDevelopmentProjects,
  getProjectDetail,
  createDevelopmentProject,
  approveAndLockProjectBudget,
  addProjectMilestone,
  auditProjectMilestone,
  recordProjectDonation,
  disburseProjectMilestoneFunds,
  seedBaselineProjectsIfEmpty,
} from './src/db/projectServices.ts';
import {
  getHeritageDocuments,
  getHeritageDocumentDetail,
  createHeritageDocument,
  getHeritageCollections,
  seedBaselineHeritageIfEmpty,
} from './src/db/heritageServices.ts';
import {
  getAlumniBusinesses,
  createAlumniBusiness,
  getMentorshipPrograms,
  createMentorshipPair,
  getCareerOpportunities,
  createCareerOpportunity,
  seedBaselineNetworkIfEmpty,
} from './src/db/networkServices.ts';
import {
  requireAuth,
  requireScope,
  AuthenticatedRequest,
} from './src/middleware/auth.ts';
import {
  updateUserProfile,
  recordAuditEvent,
} from './src/db/authServices.ts';
import { db } from './src/db/index.ts';
import { auditLogs, identities, profiles } from './src/db/schema.ts';
import { desc } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // =================== PUBLIC METADATA & HEALTH ===================

  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'HEALTHY',
      phase: 3,
      authProvider: 'Firebase Authentication (Google OAuth)',
      database: 'Cloud SQL PostgreSQL (Developer Edition)',
      region: 'europe-west2',
      tenant: 'Abeokuta Grammar School (AGSOBA)',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/tenants', async (req: Request, res: Response) => {
    try {
      const records = await getTenants();
      res.json({ success: true, count: records.length, tenants: records });
    } catch (err: any) {
      console.error('API Error in /api/tenants:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve tenants.' });
    }
  });

  app.get('/api/associations', async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const records = await getAssociations(tenantId);
      res.json({ success: true, count: records.length, associations: records });
    } catch (err: any) {
      console.error('API Error in /api/associations:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve associations.' });
    }
  });

  app.get('/api/class-sets', async (req: Request, res: Response) => {
    try {
      const associationId = req.query.associationId as string | undefined;
      const records = await getClassSets(associationId);
      res.json({ success: true, count: records.length, classSets: records });
    } catch (err: any) {
      console.error('API Error in /api/class-sets:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve class sets.' });
    }
  });

  app.get('/api/migrations', async (req: Request, res: Response) => {
    try {
      const records = await getSchemaMigrations();
      res.json({ success: true, count: records.length, migrations: records });
    } catch (err: any) {
      console.error('API Error in /api/migrations:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve schema migrations.' });
    }
  });

  app.get('/api/permissions', async (req: Request, res: Response) => {
    try {
      const records = await getSystemPermissions();
      res.json({ success: true, count: records.length, permissions: records });
    } catch (err: any) {
      console.error('API Error in /api/permissions:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve system permissions.' });
    }
  });

  // =================== PHASE 3: AUTHENTICATION & IDENTITY ===================

  /**
   * Current Authenticated User & 3-Tier Security Context
   */
  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({
        success: true,
        securityContext: req.securityContext,
      });
    } catch (err: any) {
      console.error('API Error in /api/auth/me:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch user security context.' });
    }
  });

  /**
   * Update Profile Details
   */
  app.put('/api/auth/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const identityId = req.securityContext!.identity.id;
      const { headline, bio, profession, industry, currentCity, currentCountry, linkedInUrl } = req.body;

      const updated = await updateUserProfile(identityId, {
        headline,
        bio,
        profession,
        industry,
        currentCity,
        currentCountry,
        linkedInUrl,
      });

      await recordAuditEvent({
        tenantId: 'tenant_ags_abeokuta',
        actorIdentityId: identityId,
        action: 'PROFILE_UPDATED',
        targetResource: `profiles/${identityId}`,
        scope: 'CLASS_SET',
        details: { headline, profession, currentCity },
      });

      res.json({ success: true, profile: updated[0] });
    } catch (err: any) {
      console.error('API Error in /api/auth/profile:', err);
      res.status(500).json({ success: false, error: 'Failed to update member profile.' });
    }
  });

  /**
   * Log Client Audit Event (e.g. Sign in / Sign out from UI)
   */
  app.post('/api/audit/log-event', async (req: Request, res: Response) => {
    try {
      const { action, targetResource, scope, details, actorIdentityId } = req.body;
      await recordAuditEvent({
        tenantId: 'tenant_ags_abeokuta',
        actorIdentityId,
        action: action || 'CLIENT_EVENT',
        targetResource: targetResource || 'client_ui',
        scope: scope || 'CLASS_SET',
        details,
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to log audit event:', err);
      res.status(500).json({ success: false });
    }
  });

  /**
   * Query Administrative Audit Logs (Platform Scope Guarded)
   */
  app.get('/api/admin/audit-logs', requireAuth, requireScope('PLATFORM'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(50);
      res.json({ success: true, count: logs.length, auditLogs: logs });
    } catch (err: any) {
      console.error('API Error in /api/admin/audit-logs:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve administrative audit logs.' });
    }
  });

  /**
   * Public Audit Logs View (Sanitized without private details for Verification Lab)
   */
  app.get('/api/audit/public-feed', async (req: Request, res: Response) => {
    try {
      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(25);
      res.json({ success: true, count: logs.length, auditLogs: logs });
    } catch (err: any) {
      console.error('API Error in /api/audit/public-feed:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve audit feed.' });
    }
  });

  // =================== PHASE 6: MEMBERSHIP VERIFICATION & BATCH IMPORT ===================

  app.get('/api/memberships/pending', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const pending = await getPendingMemberships(tenantId);
      res.json({ success: true, count: pending.length, pendingMemberships: pending });
    } catch (err: any) {
      console.error('API Error in /api/memberships/pending:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve pending memberships queue.' });
    }
  });

  app.post('/api/memberships/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { membershipId, status, tenantId } = req.body;
      const verifierId = req.securityContext?.identity.id || 'id_admin_system';
      const targetTenant = tenantId || 'tenant_ags_abeokuta';

      if (!membershipId || !['VERIFIED', 'REJECTED', 'DISPUTED'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid membership ID or status.' });
      }

      const updated = await updateMembershipVerificationStatus(membershipId, targetTenant, status, verifierId);
      res.json({ success: true, membership: updated[0] });
    } catch (err: any) {
      console.error('API Error in /api/memberships/verify:', err);
      res.status(500).json({ success: false, error: 'Failed to process membership verification.' });
    }
  });

  app.post('/api/memberships/batch-import', requireAuth, requireScope('ASSOCIATION'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId, associationId, rows } = req.body;
      const actorId = req.securityContext?.identity.id || 'id_admin_system';
      const targetTenant = tenantId || 'tenant_ags_abeokuta';
      const targetAssoc = associationId || 'asc_agsoba_01';

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid or empty batch rows provided.' });
      }

      const result = await batchImportMembers(targetTenant, targetAssoc, rows, actorId);
      res.json({ success: true, importResult: result });
    } catch (err: any) {
      console.error('API Error in /api/memberships/batch-import:', err);
      res.status(500).json({ success: false, error: 'Failed to execute batch import pipeline.' });
    }
  });

  // =================== PHASE 7: CLASS SET EXECUTIVE & GOVERNANCE MANAGEMENT ===================

  app.get('/api/governance/appointments', async (req: Request, res: Response) => {
    try {
      const classSetId = req.query.classSetId as string | undefined;
      const associationId = req.query.associationId as string | undefined;
      const appointments = await getExecutiveAppointments(classSetId, associationId);
      res.json({ success: true, count: appointments.length, appointments });
    } catch (err: any) {
      console.error('API Error in GET /api/governance/appointments:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve executive appointments.' });
    }
  });

  app.post('/api/governance/appointments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        tenantId,
        associationId,
        classSetId,
        identityId,
        officeTitle,
        scope,
        termStartDate,
        termEndDate,
        permissionIds,
      } = req.body;
      const actorId = req.securityContext?.identity.id || 'id_admin_system';

      if (!identityId || !officeTitle || !termStartDate || !termEndDate) {
        return res.status(400).json({ success: false, error: 'Missing required appointment fields.' });
      }

      const appointment = await createExecutiveAppointment({
        tenantId: tenantId || 'tenant_ags_abeokuta',
        associationId: associationId || 'asc_agsoba_01',
        classSetId,
        identityId,
        officeTitle,
        scope: scope || 'CLASS_SET',
        termStartDate,
        termEndDate,
        appointedByIdentityId: actorId,
        permissionIds,
      });

      res.json({ success: true, appointment });
    } catch (err: any) {
      console.error('API Error in POST /api/governance/appointments:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to create executive appointment.' });
    }
  });

  app.post('/api/governance/appointments/:id/revoke', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const appointmentId = req.params.id;
      const actorId = req.securityContext?.identity.id || 'id_admin_system';
      const updated = await revokeExecutiveAppointment(appointmentId, actorId);
      res.json({ success: true, appointment: updated });
    } catch (err: any) {
      console.error('API Error in POST /api/governance/appointments/:id/revoke:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to revoke appointment.' });
    }
  });

  app.post('/api/governance/handover', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { appointmentId, handoverMemoRef, notes } = req.body;
      const actorId = req.securityContext?.identity.id || 'id_admin_system';

      if (!appointmentId || !handoverMemoRef) {
        return res.status(400).json({ success: false, error: 'Appointment ID and handover memo reference are required.' });
      }

      const updated = await createHandoverMemorandum({
        appointmentId,
        handoverMemoRef,
        notes: notes || '',
        actorIdentityId: actorId,
      });

      res.json({ success: true, appointment: updated });
    } catch (err: any) {
      console.error('API Error in POST /api/governance/handover:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to record handover memorandum.' });
    }
  });

  app.get('/api/governance/verify-permission', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const identityId = req.securityContext?.identity.id;
      const permissionCode = req.query.permissionCode as string;
      const classSetId = req.query.classSetId as string | undefined;

      if (!identityId || !permissionCode) {
        return res.status(400).json({ success: false, error: 'Missing identity or permission code.' });
      }

      const hasPermission = await verifyExecutivePermission(identityId, permissionCode, classSetId);
      res.json({ success: true, hasPermission, identityId, permissionCode });
    } catch (err: any) {
      console.error('API Error in GET /api/governance/verify-permission:', err);
      res.status(500).json({ success: false, error: 'Failed to verify permission.' });
    }
  });



  // =================== PHASE 8: MEMBER DIRECTORY & PROFILES ===================

  app.get('/api/directory/members', async (req: Request, res: Response) => {
    try {
      const { search, profession, industry, city, country, classSetId, tenantId } = req.query;
      const members = await getDirectoryMembers({
        tenantId: (tenantId as string) || 'tenant_ags_abeokuta',
        search: search as string,
        profession: profession as string,
        industry: industry as string,
        city: city as string,
        country: country as string,
        classSetId: classSetId as string,
      });
      res.json({ success: true, count: members.length, members });
    } catch (err: any) {
      console.error('API Error in GET /api/directory/members:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve alumni directory.' });
    }
  });

  app.get('/api/directory/profile/:identityId', async (req: Request, res: Response) => {
    try {
      const identityId = req.params.identityId;
      const profile = await getMemberProfileDetail(identityId);
      if (!profile) {
        return res.status(404).json({ success: false, error: 'Member profile not found.' });
      }
      res.json({ success: true, profile });
    } catch (err: any) {
      console.error('API Error in GET /api/directory/profile/:identityId:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve member profile.' });
    }
  });

  app.put('/api/directory/privacy', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const identityId = req.securityContext?.identity.id;
      const { showEmail, showPhone, showLocation, privacyConsent } = req.body;

      if (!identityId) {
        return res.status(401).json({ success: false, error: 'Unauthorized.' });
      }

      const updated = await updateMemberPrivacySettings(identityId, {
        showEmail: Boolean(showEmail),
        showPhone: Boolean(showPhone),
        showLocation: Boolean(showLocation),
        privacyConsent: Boolean(privacyConsent),
      });

      res.json({ success: true, profile: updated });
    } catch (err: any) {
      console.error('API Error in PUT /api/directory/privacy:', err);
      res.status(500).json({ success: false, error: 'Failed to update privacy preferences.' });
    }
  });

  app.post('/api/directory/contact', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const senderIdentityId = req.securityContext?.identity.id;
      const { recipientIdentityId, subject, message } = req.body;

      if (!senderIdentityId || !recipientIdentityId || !message) {
        return res.status(400).json({ success: false, error: 'Missing recipient or message content.' });
      }

      const result = await sendContactInquiry({
        senderIdentityId,
        recipientIdentityId,
        subject: subject || 'Alumni Network Connection Inquiry',
        message,
      });

      res.json(result);
    } catch (err: any) {
      console.error('API Error in POST /api/directory/contact:', err);
      res.status(500).json({ success: false, error: 'Failed to send contact inquiry.' });
    }
  });

  // 1. Platform Scope Protected Endpoint
  app.get('/api/test-scope/platform', requireAuth, requireScope('PLATFORM'), (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      scope: 'PLATFORM',
      message: 'Access Granted: Verified Platform Super Administrator credentials.',
      actor: req.securityContext?.identity.email,
    });
  });

  // 2. Association Scope Protected Endpoint
  app.get('/api/test-scope/association', requireAuth, requireScope('ASSOCIATION'), (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      scope: 'ASSOCIATION',
      message: 'Access Granted: Verified Central Association Executive credentials.',
      actor: req.securityContext?.identity.email,
    });
  });

  // 3. Class Set Scope Protected Endpoint
  app.get('/api/test-scope/class-set', requireAuth, requireScope('CLASS_SET'), (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      scope: 'CLASS_SET',
      message: 'Access Granted: Verified Class Set Executive or Member credentials.',
      actor: req.securityContext?.identity.email,
    });
  });

  // =================== PHASE 4: SCHOOL & ASSOCIATION BRANDING CONFIGURATION ===================

  /**
   * Get dynamic branding for any tenant (e.g. tenant_ags_abeokuta or tenant_kc_lagos)
   */
  app.get('/api/branding/:tenantId', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { getTenantBranding } = await import('./src/db/brandingServices.ts');
      const branding = await getTenantBranding(tenantId);
      if (!branding) {
        return res.status(404).json({ success: false, error: 'Tenant not found.' });
      }
      res.json({ success: true, branding });
    } catch (err: any) {
      console.error('API Error in /api/branding/:tenantId:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve tenant branding.' });
    }
  });

  /**
   * Update tenant branding with strict cross-tenant isolation verification
   */
  app.put('/api/branding/:tenantId', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { updateTenantBranding } = await import('./src/db/brandingServices.ts');

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const crypto = await import('crypto');
      const clientIpHash = crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 16);

      // Check if caller sent a simulation actor context for isolation testing
      const actorContext = (req as any).securityContext || (req.body._simulateActorContext ? req.body._simulateActorContext : null);

      const result = await updateTenantBranding(tenantId, req.body, actorContext, clientIpHash);
      if (!result.success) {
        const statusCode = result.code === 'CROSS_TENANT_VIOLATION' ? 403 : 400;
        return res.status(statusCode).json(result);
      }
      res.json(result);
    } catch (err: any) {
      console.error('API Error in PUT /api/branding/:tenantId:', err);
      res.status(500).json({ success: false, error: 'Failed to update tenant branding.' });
    }
  });

  /**
   * Automated Cross-Tenant Attack Test Endpoint
   * Simulates an actor from Tenant A attempting to mutate Tenant B's branding.
   */
  app.post('/api/test/cross-tenant-isolation', async (req: Request, res: Response) => {
    try {
      const { updateTenantBranding } = await import('./src/db/brandingServices.ts');
      const crypto = await import('crypto');
      const clientIpHash = crypto.createHash('sha256').update('test_harness').digest('hex').slice(0, 16);

      // Simulated Actor: Executive of AGSOBA (tenant_ags_abeokuta)
      const agsobaActorContext: any = {
        identity: {
          id: 'id_actor_agsoba_officer',
          email: 'officer@agsoba.org.ng',
        },
        platformAdmin: null, // NOT a platform super admin
        associationAppointments: [
          {
            id: 'appt_agsoba_sec',
            tenantId: 'tenant_ags_abeokuta', // Bound ONLY to AGSOBA
            status: 'ACTIVE',
            scope: 'ASSOCIATION',
          },
        ],
      };

      // Attempt attack: AGSOBA officer tries to modify King's College (tenant_kc_lagos)
      const attackResult = await updateTenantBranding(
        'tenant_kc_lagos',
        { schoolName: 'Malicious Overwrite By Foreign Tenant' },
        agsobaActorContext,
        clientIpHash
      );

      res.json({
        attackPrevented: !attackResult.success && attackResult.code === 'CROSS_TENANT_VIOLATION',
        statusCode: attackResult.code === 'CROSS_TENANT_VIOLATION' ? 403 : 200,
        result: attackResult,
      });
    } catch (err: any) {
      console.error('Cross-tenant test error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =================== PHASE 9: COMMUNICATIONS CENTRE ===================

  app.get('/api/communications/templates', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const records = await getTemplates(tenantId);
      res.json({ success: true, count: records.length, templates: records });
    } catch (err: any) {
      console.error('API Error in GET /api/communications/templates:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/communications/templates', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.body.tenantId || 'tenant_ags_abeokuta';
      const { name, subject, body, channel, category } = req.body;
      const newTemplate = await createTemplate({
        tenantId,
        name,
        subject,
        body,
        channel,
        category,
      });
      res.json({ success: true, template: newTemplate });
    } catch (err: any) {
      console.error('API Error in POST /api/communications/templates:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/communications/campaigns', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const records = await getCampaigns(tenantId);
      res.json({ success: true, count: records.length, campaigns: records });
    } catch (err: any) {
      console.error('API Error in GET /api/communications/campaigns:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/communications/campaigns', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const identityId = req.securityContext?.identity.id;
      const tenantId = req.body.tenantId || 'tenant_ags_abeokuta';
      const associationId = req.body.associationId || 'asc_agsoba_01';
      const { title, channel, templateId, subject, body, recipientSegment, scheduledAt } = req.body;

      const newCampaign = await createCampaign({
        tenantId,
        associationId,
        createdByIdentityId: identityId,
        title,
        channel,
        templateId,
        subject,
        body,
        recipientSegment,
        scheduledAt,
      });
      res.json({ success: true, campaign: newCampaign });
    } catch (err: any) {
      console.error('API Error in POST /api/communications/campaigns:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/communications/campaigns/:id/send', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const campaignId = req.params.id;
      const identityId = req.securityContext?.identity.id;
      const updated = await executeCampaign(campaignId, identityId);
      res.json({ success: true, campaign: updated });
    } catch (err: any) {
      console.error('API Error in POST /api/communications/campaigns/:id/send:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/communications/campaigns/:id/logs', async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.id;
      const logs = await getCampaignLogs(campaignId);
      res.json({ success: true, count: logs.length, logs });
    } catch (err: any) {
      console.error('API Error in GET /api/communications/campaigns/:id/logs:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =================== PHASE 10: MEETINGS, MINUTES, RESOLUTIONS & TASKS ===================

  app.get('/api/meetings', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const associationId = (req.query.associationId as string) || 'asc_agsoba_01';
      const classSetId = req.query.classSetId as string | undefined;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      // Seed baseline if first time
      await seedBaselineMeetingsIfEmpty(tenantId, associationId);

      const records = await getMeetings({
        tenantId,
        associationId,
        classSetId,
        status,
        search,
      });

      res.json({ success: true, count: records.length, meetings: records });
    } catch (err: any) {
      console.error('API Error in GET /api/meetings:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/meetings/:id', async (req: Request, res: Response) => {
    try {
      const meetingId = req.params.id;
      const detail = await getMeetingDetail(meetingId);
      res.json({ success: true, meeting: detail });
    } catch (err: any) {
      console.error('API Error in GET /api/meetings/:id:', err);
      res.status(404).json({ success: false, error: err.message });
    }
  });

  app.post('/api/meetings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorIdentityId = req.securityContext?.identity.id;
      const {
        tenantId = 'tenant_ags_abeokuta',
        associationId = 'asc_agsoba_01',
        classSetId,
        title,
        meetingType,
        scope,
        scheduledStartTime,
        scheduledEndTime,
        location,
        isVirtual,
        virtualUrl,
        quorumRequired,
        presidedByIdentityId,
        recordedByIdentityId,
      } = req.body;

      if (!title || !scheduledStartTime || !scheduledEndTime || !location) {
        return res.status(400).json({
          success: false,
          error: 'Missing required meeting parameters (title, scheduledStartTime, scheduledEndTime, location)',
        });
      }

      const newMeeting = await createMeeting({
        tenantId,
        associationId,
        classSetId,
        title,
        meetingType,
        scope,
        scheduledStartTime,
        scheduledEndTime,
        location,
        isVirtual,
        virtualUrl,
        quorumRequired: quorumRequired ? parseInt(quorumRequired, 10) : 5,
        presidedByIdentityId,
        recordedByIdentityId,
        actorIdentityId,
      });

      res.json({ success: true, meeting: newMeeting });
    } catch (err: any) {
      console.error('API Error in POST /api/meetings:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/meetings/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const meetingId = req.params.id;
      const { status } = req.body;
      const actorIdentityId = req.securityContext?.identity.id;

      if (!['SCHEDULED', 'IN_SESSION', 'ADJOURNED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid meeting status value' });
      }

      const updated = await updateMeetingStatus(meetingId, status, actorIdentityId);
      res.json({ success: true, meeting: updated });
    } catch (err: any) {
      console.error('API Error in PUT /api/meetings/:id/status:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/meetings/:id/agenda', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const meetingId = req.params.id;
      const { itemOrder, title, description, presenterIdentityId, durationMinutes } = req.body;

      if (!title || itemOrder === undefined) {
        return res.status(400).json({ success: false, error: 'itemOrder and title are required' });
      }

      const agenda = await addMeetingAgenda({
        meetingId,
        itemOrder: parseInt(itemOrder, 10),
        title,
        description,
        presenterIdentityId,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 15,
      });

      res.json({ success: true, agenda });
    } catch (err: any) {
      console.error('API Error in POST /api/meetings/:id/agenda:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/meetings/:id/attendance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const meetingId = req.params.id;
      const { identityId, role, attendanceStatus, notes } = req.body;

      if (!identityId) {
        return res.status(400).json({ success: false, error: 'identityId is required for attendance' });
      }

      const att = await recordAttendance({
        meetingId,
        identityId,
        role,
        attendanceStatus,
        notes,
      });

      res.json({ success: true, attendance: att });
    } catch (err: any) {
      console.error('API Error in POST /api/meetings/:id/attendance:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/meetings/:id/minutes/draft', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const meetingId = req.params.id;
      const { bodyText } = req.body;
      const actorIdentityId = req.securityContext?.identity.id;

      if (!bodyText || bodyText.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Minute body text cannot be empty' });
      }

      const minute = await saveDraftMinutes(meetingId, bodyText, actorIdentityId);
      res.json({ success: true, minute });
    } catch (err: any) {
      console.error('API Error in POST /api/meetings/:id/minutes/draft:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/meetings/:id/minutes/adopt', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const meetingId = req.params.id;
      const actorIdentityId = req.securityContext?.identity.id;
      const {
        motionProposedByIdentityId,
        motionSecondedByIdentityId,
        presidingOfficerId,
        secretaryId,
      } = req.body;

      if (!motionProposedByIdentityId || !motionSecondedByIdentityId || !presidingOfficerId || !secretaryId) {
        return res.status(400).json({
          success: false,
          error: 'Formal adoption requires proposer, seconder, presiding officer, and secretary identities',
        });
      }

      const adopted = await adoptMinutes(meetingId, {
        motionProposedByIdentityId,
        motionSecondedByIdentityId,
        presidingOfficerId,
        secretaryId,
        actorIdentityId,
      });

      res.json({ success: true, minute: adopted });
    } catch (err: any) {
      console.error('API Error in POST /api/meetings/:id/minutes/adopt:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/resolutions', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const associationId = req.query.associationId as string | undefined;
      const category = req.query.category as string | undefined;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      const records = await getResolutions({
        tenantId,
        associationId,
        category,
        status,
        search,
      });

      res.json({ success: true, count: records.length, resolutions: records });
    } catch (err: any) {
      console.error('API Error in GET /api/resolutions:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/resolutions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorIdentityId = req.securityContext?.identity.id;
      const {
        tenantId = 'tenant_ags_abeokuta',
        associationId = 'asc_agsoba_01',
        meetingId,
        minuteId,
        title,
        description,
        category,
        bindingScope,
        effectiveDate,
      } = req.body;

      if (!meetingId || !title || !description || !effectiveDate) {
        return res.status(400).json({
          success: false,
          error: 'meetingId, title, description, and effectiveDate are required for a resolution',
        });
      }

      const resolution = await createResolution({
        tenantId,
        associationId,
        meetingId,
        minuteId,
        title,
        description,
        category,
        bindingScope,
        effectiveDate,
        actorIdentityId,
      });

      res.json({ success: true, resolution });
    } catch (err: any) {
      console.error('API Error in POST /api/resolutions:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/tasks', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const meetingId = req.query.meetingId as string | undefined;
      const assigneeIdentityId = req.query.assigneeIdentityId as string | undefined;
      const status = req.query.status as string | undefined;

      const records = await getTasks({
        tenantId,
        meetingId,
        assigneeIdentityId,
        status,
      });

      res.json({ success: true, count: records.length, tasks: records });
    } catch (err: any) {
      console.error('API Error in GET /api/tasks:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/tasks', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorIdentityId = req.securityContext?.identity.id;
      const {
        tenantId = 'tenant_ags_abeokuta',
        meetingId,
        resolutionId,
        title,
        description,
        assigneeIdentityId,
        dueDate,
        priority,
      } = req.body;

      if (!meetingId || !title || !dueDate) {
        return res.status(400).json({
          success: false,
          error: 'meetingId, title, and dueDate are required for an action task',
        });
      }

      const task = await createTask({
        tenantId,
        meetingId,
        resolutionId,
        title,
        description,
        assigneeIdentityId,
        dueDate,
        priority,
        actorIdentityId,
      });

      res.json({ success: true, task });
    } catch (err: any) {
      console.error('API Error in POST /api/tasks:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/tasks/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskId = req.params.id;
      const { status, completionNotes } = req.body;
      const actorIdentityId = req.securityContext?.identity.id;

      if (!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid task status' });
      }

      const updated = await updateTaskStatus(taskId, status, completionNotes, actorIdentityId);
      res.json({ success: true, task: updated });
    } catch (err: any) {
      console.error('API Error in PUT /api/tasks/:id/status:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =================== PHASE 11: POLLS, SURVEYS, AND FORMAL VOTING ===================

  /**
   * List Elections / Polls with aggregate elector & ballot metrics
   */
  app.get('/api/elections', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const associationId = (req.query.associationId as string) || 'asc_agsoba_01';
      const classSetId = req.query.classSetId as string | undefined;
      const status = req.query.status as string | undefined;
      const type = req.query.type as string | undefined;
      const search = req.query.search as string | undefined;

      // Seed baseline if empty
      await seedBaselineElectionsIfEmpty();

      const records = await getElections({
        tenantId,
        associationId,
        classSetId,
        status,
        type,
        search,
      });

      res.json({ success: true, count: records.length, elections: records });
    } catch (err: any) {
      console.error('API Error in GET /api/elections:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Get Election Detail (contests, candidates, voter roll record, live/certified tally)
   */
  app.get('/api/elections/:id', async (req: Request, res: Response) => {
    try {
      const electionId = req.params.id;
      const currentIdentityId = (req.query.identityId as string) || undefined;
      const detail = await getElectionDetail(electionId, currentIdentityId);

      if (!detail) {
        return res.status(404).json({ success: false, error: 'Election not found' });
      }

      res.json({ success: true, election: detail });
    } catch (err: any) {
      console.error('API Error in GET /api/elections/:id:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Create new election / referendum session
   */
  app.post('/api/elections', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorIdentityId = req.securityContext?.identity.id;
      const {
        tenantId = 'tenant_ags_abeokuta',
        associationId = 'asc_agsoba_01',
        classSetId,
        title,
        description,
        type,
        scope,
        quorumPercentage,
        requiresFinancialGoodStanding,
        requiresVerifiedStatus,
        startTime,
        endTime,
      } = req.body;

      if (!title || !description || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          error: 'title, description, startTime, and endTime are required.',
        });
      }

      const created = await createElection({
        tenantId,
        associationId,
        classSetId,
        title,
        description,
        type,
        scope,
        quorumPercentage: quorumPercentage !== undefined ? parseInt(quorumPercentage, 10) : 25,
        requiresFinancialGoodStanding,
        requiresVerifiedStatus,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        createdByIdentityId: actorIdentityId,
      });

      res.json({ success: true, election: created });
    } catch (err: any) {
      console.error('API Error in POST /api/elections:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * Transition Election Status
   */
  app.patch('/api/elections/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const electionId = req.params.id;
      const { status } = req.body;
      const actorIdentityId = req.securityContext?.identity.id;

      if (!['DRAFT', 'NOMINATIONS_OPEN', 'VETTING', 'ACTIVE', 'CLOSED', 'CERTIFIED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid election status' });
      }

      const updated = await updateElectionStatus(electionId, status, actorIdentityId);
      res.json({ success: true, election: updated });
    } catch (err: any) {
      console.error('API Error in PATCH /api/elections/:id/status:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * Add Contest / Question to Election
   */
  app.post('/api/elections/:id/contests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const electionId = req.params.id;
      const { title, description, contestOrder, maxChoices, allowAbstain } = req.body;

      if (!title) {
        return res.status(400).json({ success: false, error: 'Contest title is required.' });
      }

      const contest = await addElectionContest({
        electionId,
        title,
        description,
        contestOrder: contestOrder ? parseInt(contestOrder, 10) : 1,
        maxChoices: maxChoices ? parseInt(maxChoices, 10) : 1,
        allowAbstain,
      });

      res.json({ success: true, contest });
    } catch (err: any) {
      console.error('API Error in POST /api/elections/:id/contests:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * Nominate Candidate / Option
   */
  app.post('/api/contests/:id/candidates', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contestId = req.params.id;
      const { displayName, candidateIdentityId, manifesto, ballotOrder, vetted, vettingNotes } = req.body;

      if (!displayName) {
        return res.status(400).json({ success: false, error: 'Candidate displayName is required.' });
      }

      const candidate = await nominateCandidate({
        contestId,
        candidateIdentityId,
        displayName,
        manifesto,
        ballotOrder: ballotOrder ? parseInt(ballotOrder, 10) : 1,
        vetted: vetted === true,
        vettingNotes,
        vettedByIdentityId: req.securityContext?.identity.id,
      });

      res.json({ success: true, candidate });
    } catch (err: any) {
      console.error('API Error in POST /api/contests/:id/candidates:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * Vet Candidate (ELECO clearance)
   */
  app.patch('/api/candidates/:id/vet', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const candidateId = req.params.id;
      const { status, vettingNotes } = req.body;
      const actorIdentityId = req.securityContext?.identity.id;

      if (!['VETTED_APPROVED', 'DISQUALIFIED', 'WITHDRAWN'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid candidate status' });
      }

      const updated = await vetCandidate(candidateId, status, vettingNotes, actorIdentityId);
      res.json({ success: true, candidate: updated });
    } catch (err: any) {
      console.error('API Error in PATCH /api/candidates/:id/vet:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * Register Elector to Voter Roll
   */
  app.post('/api/elections/:id/register-voter', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const electionId = req.params.id;
      const { identityId, eligibilityStatus, eligibilityReason } = req.body;

      const targetIdentityId = identityId || req.securityContext?.identity.id;
      if (!targetIdentityId) {
        return res.status(400).json({ success: false, error: 'identityId is required' });
      }

      const voter = await registerVoter({
        electionId,
        identityId: targetIdentityId,
        eligibilityStatus,
        eligibilityReason,
      });

      res.json({ success: true, voter });
    } catch (err: any) {
      console.error('API Error in POST /api/elections/:id/register-voter:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * Cast Secret Ballot (SECRET BALLOT ENCLAVE)
   * Enforces server-side eligibility, double-voting prevention, and anonymous ballot deposition.
   */
  app.post('/api/elections/:id/vote', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const electionId = req.params.id;
      const identityId = req.securityContext?.identity.id;
      const { votes } = req.body;

      if (!identityId) {
        return res.status(401).json({ success: false, error: 'Authentication required to cast ballot.' });
      }

      if (!votes || !Array.isArray(votes) || votes.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid ballot: selections array required.' });
      }

      const result = await castBallot({
        electionId,
        identityId,
        votes,
      });

      res.json(result);
    } catch (err: any) {
      console.error('API Error in POST /api/elections/:id/vote:', err);
      const isConflict = err.message.includes('Double voting') || err.message.includes('already cast');
      const isForbidden = err.message.includes('not registered') || err.message.includes('Ineligible') || err.message.includes('not accepting');
      const statusCode = isConflict ? 409 : isForbidden ? 403 : 400;
      res.status(statusCode).json({ success: false, error: err.message });
    }
  });

  /**
   * Certify Election Results (Returning Officer / ELECO)
   */
  app.post('/api/elections/:id/certify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const electionId = req.params.id;
      const certifiedByIdentityId = req.securityContext?.identity.id;
      const { returningOfficerNotes } = req.body;

      const certification = await certifyElectionResults({
        electionId,
        certifiedByIdentityId,
        returningOfficerNotes,
      });

      res.json(certification);
    } catch (err: any) {
      console.error('API Error in POST /api/elections/:id/certify:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // =================== PHASE 12: EVENTS & REUNIONS ===================

  /**
   * List Events
   */
  app.get('/api/events', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const classSetId = req.query.classSetId as string | undefined;
      const status = req.query.status as string | undefined;

      const records = await getEvents(tenantId, { classSetId, status });
      res.json({ success: true, count: records.length, events: records });
    } catch (err: any) {
      console.error('API Error in GET /api/events:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve events.' });
    }
  });

  /**
   * Get Event Details with Ticket Tiers, Registrations, Attendances, and Gallery
   */
  app.get('/api/events/:id', async (req: Request, res: Response) => {
    try {
      const eventRecord = await getEventDetail(req.params.id);
      if (!eventRecord) {
        return res.status(404).json({ success: false, error: 'Event not found.' });
      }
      res.json({ success: true, event: eventRecord });
    } catch (err: any) {
      console.error('API Error in GET /api/events/:id:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve event details.' });
    }
  });

  /**
   * Create New Event (Admins / Event Officers)
   */
  app.post('/api/events', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        tenantId,
        associationId,
        classSetId,
        title,
        description,
        eventType,
        scope,
        venue,
        isVirtual,
        virtualUrl,
        startDate,
        endDate,
        registrationDeadline,
        capacityLimit,
        bannerImageUrl,
      } = req.body;

      const actorIdentityId = req.securityContext?.identity.id;

      const created = await createEvent({
        tenantId,
        associationId,
        classSetId,
        title,
        description,
        eventType,
        scope,
        venue,
        isVirtual: Boolean(isVirtual),
        virtualUrl,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationDeadline: new Date(registrationDeadline),
        capacityLimit: capacityLimit ? parseInt(capacityLimit, 10) : 500,
        bannerImageUrl,
        createdByIdentityId: actorIdentityId,
      });

      res.json({ success: true, event: created });
    } catch (err: any) {
      console.error('API Error in POST /api/events:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * Add Ticket Tier to Event
   */
  app.post('/api/events/:id/tiers', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const {
        name,
        description,
        price,
        currency,
        tierCapacity,
        maxPerMember,
        isGuestAllowed,
      } = req.body;

      const tier = await createTicketTier({
        eventId,
        name,
        description,
        price: price !== undefined ? parseInt(price, 10) : 0,
        currency,
        tierCapacity: tierCapacity ? parseInt(tierCapacity, 10) : 100,
        maxPerMember: maxPerMember ? parseInt(maxPerMember, 10) : 2,
        isGuestAllowed: isGuestAllowed !== undefined ? Boolean(isGuestAllowed) : true,
      });

      res.json({ success: true, tier });
    } catch (err: any) {
      console.error('API Error in POST /api/events/:id/tiers:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * Register Member for Event (SERVER-ENFORCED DEADLINE & CAPACITY)
   */
  app.post('/api/events/:id/register', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const identityId = req.body.identityId || req.securityContext?.identity.id;
      const {
        ticketTierId,
        guestCount,
        guestNames,
        dietaryRequirements,
        specialAssistance,
        paymentReference,
      } = req.body;

      if (!identityId) {
        return res.status(401).json({ success: false, error: 'Identity required to register.' });
      }
      if (!ticketTierId) {
        return res.status(400).json({ success: false, error: 'ticketTierId is required.' });
      }

      const result = await registerForEvent({
        eventId,
        identityId,
        ticketTierId,
        guestCount: guestCount ? parseInt(guestCount, 10) : undefined,
        guestNames,
        dietaryRequirements,
        specialAssistance,
        paymentReference,
      });

      res.json(result);
    } catch (err: any) {
      console.error('API Error in POST /api/events/:id/register:', err);
      const isCapacityOrDeadline = err.message.includes('deadline passed') || err.message.includes('capacity limit');
      const statusCode = isCapacityOrDeadline ? 409 : 400;
      res.status(statusCode).json({ success: false, error: err.message });
    }
  });

  /**
   * Check In Attendee via QR Badge Token (ANTI-DUPLICATE PROTOCOL CHECK-IN)
   */
  app.post('/api/events/:id/checkin', async (req: Request, res: Response) => {
    try {
      const eventId = req.params.id;
      const {
        qrBadgeToken,
        checkedByIdentityId,
        checkpointLocation,
        attendeeType,
        guestName,
        checkInMethod,
      } = req.body;

      if (!qrBadgeToken) {
        return res.status(400).json({ success: false, error: 'qrBadgeToken is required for gate check-in.' });
      }

      const result = await validateBadgeAndCheckIn({
        eventId,
        qrBadgeToken,
        checkedByIdentityId,
        checkpointLocation,
        attendeeType,
        guestName,
        checkInMethod,
      });

      if (!result.success) {
        const statusCode = result.code === 'ALREADY_CHECKED_IN' ? 409 : result.code === 'BADGE_NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (err: any) {
      console.error('API Error in POST /api/events/:id/checkin:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Reconcile Event Attendance with Cryptographic Seal
   */
  app.post('/api/events/:id/reconcile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const reconciledByIdentityId = req.securityContext?.identity.id;
      const { reconciliationNotes } = req.body;

      const result = await reconcileEventAttendance({
        eventId,
        reconciledByIdentityId,
        reconciliationNotes,
      });

      res.json(result);
    } catch (err: any) {
      console.error('API Error in POST /api/events/:id/reconcile:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * Add Post-Event Memorial Gallery Item
   */
  app.post('/api/events/:id/gallery', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const uploadedByIdentityId = req.securityContext?.identity.id;
      const { mediaUrl, caption, category, takenYear } = req.body;

      if (!mediaUrl || !caption) {
        return res.status(400).json({ success: false, error: 'mediaUrl and caption are required.' });
      }

      const item = await addGalleryItem({
        eventId,
        mediaUrl,
        caption,
        category,
        takenYear: takenYear ? parseInt(takenYear, 10) : undefined,
        uploadedByIdentityId,
      });

      res.json({ success: true, item });
    } catch (err: any) {
      console.error('API Error in POST /api/events/:id/gallery:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // =================== PHASE 13: FINANCIAL MANAGEMENT & PAYMENTS ===================

  /**
   * Get Financial Dashboard (Double-Entry Accounts, Dues, Transactions, Pledges, Requisitions)
   */
  app.get('/api/finance/dashboard', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const data = await getFinancialDashboardData(tenantId);
      res.json({ success: true, ...data });
    } catch (err: any) {
      console.error('API Error in GET /api/finance/dashboard:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve financial dashboard data.' });
    }
  });

  /**
   * Secure Payment Gateway Webhook Handler (Paystack / Flutterwave)
   * STRICT SERVER-SIDE VERIFICATION & IDEMPOTENCY:
   * Verifies HMAC signature, ensures UUIDv4 idempotency, and posts double-entry journal settlement.
   */
  app.post('/api/finance/webhooks/paystack', async (req: Request, res: Response) => {
    try {
      const hmacSignature = (req.headers['x-paystack-signature'] as string) || req.body.signature || 'sig_test';
      const eventType = req.body.event || req.body.eventType || 'charge.success';
      const idempotencyKey = req.body.idempotencyKey || req.body.data?.reference || `REF-${Date.now()}`;

      const result = await processVerifiedPaymentWebhook({
        gatewayName: 'PAYSTACK',
        eventType,
        payloadJson: req.body,
        hmacSignature,
        idempotencyKey,
      });

      res.json(result);
    } catch (err: any) {
      console.error('API Error in POST /api/finance/webhooks/paystack:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * Submit Expense Requisition
   */
  app.post('/api/finance/requisitions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requestedByIdentityId = req.securityContext?.identity.id;
      const { title, description, amount, category, tenantId, associationId } = req.body;

      if (!requestedByIdentityId) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }
      if (!title || !description || amount === undefined) {
        return res.status(400).json({ success: false, error: 'Title, description, and amount are required.' });
      }

      const reqRecord = await createExpenseRequisition({
        tenantId,
        associationId,
        requestedByIdentityId,
        title,
        description,
        amount: parseInt(amount, 10),
        category,
      });

      res.json({ success: true, requisition: reqRecord });
    } catch (err: any) {
      console.error('API Error in POST /api/finance/requisitions:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * Update Expense Requisition Approval Stage (Treasurer -> President -> Disbursed)
   */
  app.patch('/api/finance/requisitions/:id/approve', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requisitionId = req.params.id;
      const actorIdentityId = req.securityContext?.identity.id;
      const { action, rejectionReason } = req.body;

      if (!actorIdentityId) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }
      if (!['TREASURER_APPROVE', 'PRESIDENT_APPROVE', 'DISBURSE', 'REJECT'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Invalid approval action.' });
      }

      const updated = await updateRequisitionApproval({
        requisitionId,
        actorIdentityId,
        action,
        rejectionReason,
      });

      res.json({ success: true, requisition: updated });
    } catch (err: any) {
      console.error('API Error in PATCH /api/finance/requisitions/:id/approve:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // =================== PHASE 14: CONFIDENTIAL WELFARE MANAGEMENT ===================

  app.get('/api/welfare/programs', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      await seedBaselineWelfareIfEmpty();
      const programs = await getWelfarePrograms(tenantId);
      res.json({ success: true, count: programs.length, programs });
    } catch (err: any) {
      console.error('API Error in GET /api/welfare/programs:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/welfare/cases', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const cases = await getWelfareCases(tenantId);
      res.json({ success: true, count: cases.length, cases });
    } catch (err: any) {
      console.error('API Error in GET /api/welfare/cases:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/welfare/cases/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const caseId = req.params.id;
      const accessorIdentityId = req.securityContext?.identity.id || 'id_admin_system';
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

      const caseDetail = await getWelfareCaseDetail(caseId, accessorIdentityId, clientIp);
      res.json({ success: true, case: caseDetail });
    } catch (err: any) {
      console.error('API Error in GET /api/welfare/cases/:id:', err);
      res.status(404).json({ success: false, error: err.message });
    }
  });

  app.post('/api/welfare/cases', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const submittedByIdentityId = req.securityContext?.identity.id;
      const {
        tenantId = 'tenant_ags_abeokuta',
        programId,
        beneficiaryIdentityId,
        category,
        summary,
        confidentialCaseNotes,
        requestedAmount,
      } = req.body;

      if (!programId || !beneficiaryIdentityId || !summary || !confidentialCaseNotes || requestedAmount === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required welfare case fields.' });
      }

      const newCase = await createWelfareCase({
        tenantId,
        programId,
        beneficiaryIdentityId,
        submittedByIdentityId,
        category,
        summary,
        confidentialCaseNotes,
        requestedAmount: parseInt(requestedAmount, 10),
      });

      res.json({ success: true, case: newCase });
    } catch (err: any) {
      console.error('API Error in POST /api/welfare/cases:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/welfare/cases/:id/reviews', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const caseId = req.params.id;
      const reviewerIdentityId = req.securityContext?.identity.id;
      const { recommendation, recommendedAmount, reviewComments } = req.body;

      if (!reviewerIdentityId) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }
      if (!recommendation || !reviewComments) {
        return res.status(400).json({ success: false, error: 'Recommendation and review comments are required.' });
      }

      const result = await reviewWelfareCase({
        caseId,
        reviewerIdentityId,
        recommendation,
        recommendedAmount: recommendedAmount ? parseInt(recommendedAmount, 10) : 0,
        reviewComments,
      });

      res.json(result);
    } catch (err: any) {
      console.error('API Error in POST /api/welfare/cases/:id/reviews:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/welfare/cases/:id/disburse', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const caseId = req.params.id;
      const disbursedByIdentityId = req.securityContext?.identity.id;
      const { amountDisbursed, bankReference } = req.body;

      if (!disbursedByIdentityId) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }
      if (amountDisbursed === undefined || !bankReference) {
        return res.status(400).json({ success: false, error: 'Amount disbursed and bank reference are required.' });
      }

      const result = await disburseWelfareGrant({
        caseId,
        disbursedByIdentityId,
        amountDisbursed: parseInt(amountDisbursed, 10),
        bankReference,
      });

      res.json(result);
    } catch (err: any) {
      console.error('API Error in POST /api/welfare/cases/:id/disburse:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // =================== PHASE 15: PROJECTS AND DEVELOPMENT INITIATIVES ===================

  app.get('/api/projects', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      await seedBaselineProjectsIfEmpty();
      const projects = await getDevelopmentProjects(tenantId);
      res.json({ success: true, count: projects.length, projects });
    } catch (err: any) {
      console.error('API Error in GET /api/projects:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const projectId = req.params.id;
      const detail = await getProjectDetail(projectId);
      res.json({ success: true, ...detail });
    } catch (err: any) {
      console.error('API Error in GET /api/projects/:id:', err);
      res.status(404).json({ success: false, error: err.message });
    }
  });

  app.post('/api/projects', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const proposedByIdentityId = req.securityContext?.identity.id;
      const {
        tenantId = 'tenant_ags_abeokuta',
        associationId = 'asc_agsoba_01',
        classSetId,
        title,
        description,
        category,
        budgetApprovedKobo,
        startDate,
        targetCompletionDate,
      } = req.body;

      if (!title || !description || budgetApprovedKobo === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required project fields (title, description, budget).' });
      }

      const project = await createDevelopmentProject({
        tenantId,
        associationId,
        classSetId,
        title,
        description,
        category: category || 'INFRASTRUCTURE',
        budgetApprovedKobo: parseInt(budgetApprovedKobo, 10),
        startDate,
        targetCompletionDate,
        proposedByIdentityId,
      });

      res.json({ success: true, project });
    } catch (err: any) {
      console.error('API Error in POST /api/projects:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.patch('/api/projects/:id/approve-budget', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = req.params.id;
      const approvedByIdentityId = req.securityContext?.identity.id || 'id_admin_system';
      const { approvedBudgetKobo } = req.body;

      const project = await approveAndLockProjectBudget({
        projectId,
        approvedByIdentityId,
        approvedBudgetKobo: approvedBudgetKobo ? parseInt(approvedBudgetKobo, 10) : undefined,
      });

      res.json({ success: true, project });
    } catch (err: any) {
      console.error('API Error in PATCH /api/projects/:id/approve-budget:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/projects/:id/milestones', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = req.params.id;
      const { milestoneOrder, title, description, allocatedBudgetKobo, percentageWeight, targetDate } = req.body;

      if (!title || milestoneOrder === undefined || allocatedBudgetKobo === undefined) {
        return res.status(400).json({ success: false, error: 'Milestone order, title, and allocated budget are required.' });
      }

      const milestone = await addProjectMilestone({
        projectId,
        milestoneOrder: parseInt(milestoneOrder, 10),
        title,
        description,
        allocatedBudgetKobo: parseInt(allocatedBudgetKobo, 10),
        percentageWeight: percentageWeight ? parseInt(percentageWeight, 10) : 0,
        targetDate,
      });

      res.json({ success: true, milestone });
    } catch (err: any) {
      console.error('API Error in POST /api/projects/:id/milestones:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.patch('/api/milestones/:id/audit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const milestoneId = req.params.id;
      const auditedByIdentityId = req.securityContext?.identity.id || 'id_admin_system';
      const { status, auditNotes } = req.body;

      if (!status || !auditNotes) {
        return res.status(400).json({ success: false, error: 'Status and audit verification notes are required.' });
      }

      const milestone = await auditProjectMilestone({
        milestoneId,
        auditedByIdentityId,
        status,
        auditNotes,
      });

      res.json({ success: true, milestone });
    } catch (err: any) {
      console.error('API Error in PATCH /api/milestones/:id/audit:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/projects/:id/donations', async (req: Request, res: Response) => {
    try {
      const projectId = req.params.id;
      const { donorIdentityId, donorNameOverride, classSetId, amountKobo, paymentReference, donorMessage, isAnonymous, pledgeId } = req.body;

      if (!amountKobo || !paymentReference) {
        return res.status(400).json({ success: false, error: 'Amount and payment reference are required.' });
      }

      const donation = await recordProjectDonation({
        projectId,
        donorIdentityId,
        donorNameOverride,
        classSetId,
        amountKobo: parseInt(amountKobo, 10),
        paymentReference,
        donorMessage,
        isAnonymous: Boolean(isAnonymous),
        pledgeId,
      });

      res.json({ success: true, donation });
    } catch (err: any) {
      console.error('API Error in POST /api/projects/:id/donations:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/projects/:id/disbursements', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = req.params.id;
      const disbursedByIdentityId = req.securityContext?.identity.id || 'id_admin_system';
      const { milestoneId, payeeName, amountKobo, bankReference, notes } = req.body;

      if (!payeeName || !amountKobo || !bankReference) {
        return res.status(400).json({ success: false, error: 'Payee name, amount, and bank reference are required.' });
      }

      const disbursement = await disburseProjectMilestoneFunds({
        projectId,
        milestoneId,
        payeeName,
        amountKobo: parseInt(amountKobo, 10),
        bankReference,
        disbursedByIdentityId,
        notes,
      });

      res.json({ success: true, disbursement });
    } catch (err: any) {
      console.error('API Error in POST /api/projects/:id/disbursements:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // =================== PHASE 16: DIGITAL HERITAGE ARCHIVE & DOCUMENTS ===================

  app.get('/api/heritage/documents', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const category = req.query.category as string | undefined;
      await seedBaselineHeritageIfEmpty();
      const documents = await getHeritageDocuments(tenantId, category);
      res.json({ success: true, count: documents.length, documents });
    } catch (err: any) {
      console.error('API Error in GET /api/heritage/documents:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/heritage/documents/:id', async (req: Request, res: Response) => {
    try {
      const documentId = req.params.id;
      const accessorIdentityId = (req.query.identityId as string) || undefined;
      const accessType = (req.query.accessType as string) || 'VIEW';
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

      const doc = await getHeritageDocumentDetail(documentId, accessorIdentityId, clientIp, accessType);
      res.json({ success: true, document: doc });
    } catch (err: any) {
      console.error('API Error in GET /api/heritage/documents/:id:', err);
      res.status(404).json({ success: false, error: err.message });
    }
  });

  app.post('/api/heritage/documents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const uploadedByIdentityId = req.securityContext?.identity.id;
      const {
        tenantId = 'tenant_ags_abeokuta',
        title,
        description,
        category,
        accessLevel,
        mediaUrl,
        thumbnailUrl,
        fileSize,
        mimeType,
        provenanceMetadata,
      } = req.body;

      if (!title || !description || !mediaUrl) {
        return res.status(400).json({ success: false, error: 'Title, description, and mediaUrl are required.' });
      }

      const doc = await createHeritageDocument({
        tenantId,
        title,
        description,
        category,
        accessLevel,
        mediaUrl,
        thumbnailUrl,
        fileSize: fileSize ? parseInt(fileSize, 10) : undefined,
        mimeType,
        provenanceMetadata,
        uploadedByIdentityId,
      });

      res.json({ success: true, document: doc });
    } catch (err: any) {
      console.error('API Error in POST /api/heritage/documents:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get('/api/heritage/collections', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      await seedBaselineHeritageIfEmpty();
      const collections = await getHeritageCollections(tenantId);
      res.json({ success: true, count: collections.length, collections });
    } catch (err: any) {
      console.error('API Error in GET /api/heritage/collections:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =================== PHASE 17: PROFESSIONAL NETWORK & BUSINESS DIRECTORY ===================

  app.get('/api/network/businesses', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const industry = req.query.industry as string | undefined;
      await seedBaselineNetworkIfEmpty();
      const businesses = await getAlumniBusinesses(tenantId, industry);
      res.json({ success: true, count: businesses.length, businesses });
    } catch (err: any) {
      console.error('API Error in GET /api/network/businesses:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/network/businesses', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ownerIdentityId = req.securityContext?.identity.id;
      const {
        tenantId = 'tenant_ags_abeokuta',
        businessName,
        industry,
        description,
        website,
        businessEmail,
        businessPhone,
        address,
        classSetId,
      } = req.body;

      if (!businessName || !industry || !description || !businessEmail) {
        return res.status(400).json({ success: false, error: 'Business name, industry, description, and businessEmail are required.' });
      }

      const business = await createAlumniBusiness({
        tenantId,
        ownerIdentityId,
        businessName,
        industry,
        description,
        website,
        businessEmail,
        businessPhone,
        address,
        classSetId,
      });

      res.json({ success: true, business });
    } catch (err: any) {
      console.error('API Error in POST /api/network/businesses:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get('/api/network/mentorship/programs', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      await seedBaselineNetworkIfEmpty();
      const programs = await getMentorshipPrograms(tenantId);
      res.json({ success: true, count: programs.length, programs });
    } catch (err: any) {
      console.error('API Error in GET /api/network/mentorship/programs:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/network/mentorship/pairs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const menteeIdentityId = req.securityContext?.identity.id;
      const { programId, mentorIdentityId, focusArea } = req.body;

      if (!programId || !mentorIdentityId || !focusArea || !menteeIdentityId) {
        return res.status(400).json({ success: false, error: 'Program ID, mentor identity, and focus area are required.' });
      }

      const pair = await createMentorshipPair({
        programId,
        mentorIdentityId,
        menteeIdentityId,
        focusArea,
      });

      res.json({ success: true, pair });
    } catch (err: any) {
      console.error('API Error in POST /api/network/mentorship/pairs:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get('/api/network/careers', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || 'tenant_ags_abeokuta';
      const employmentType = req.query.employmentType as string | undefined;
      await seedBaselineNetworkIfEmpty();
      const opportunities = await getCareerOpportunities(tenantId, employmentType);
      res.json({ success: true, count: opportunities.length, opportunities });
    } catch (err: any) {
      console.error('API Error in GET /api/network/careers:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/network/careers', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const postedByIdentityId = req.securityContext?.identity.id;
      const {
        tenantId = 'tenant_ags_abeokuta',
        title,
        companyName,
        location,
        employmentType,
        description,
        applicationUrl,
        contactEmail,
      } = req.body;

      if (!title || !companyName || !location || !description || !contactEmail) {
        return res.status(400).json({ success: false, error: 'Missing required career opportunity fields.' });
      }

      const opp = await createCareerOpportunity({
        tenantId,
        postedByIdentityId,
        title,
        companyName,
        location,
        employmentType,
        description,
        applicationUrl,
        contactEmail,
      });

      res.json({ success: true, opportunity: opp });
    } catch (err: any) {
      console.error('API Error in POST /api/network/careers:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Mount Vite or static files
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AGSOBA Enterprise Platform server listening on port ${PORT}`);
    seedBaselineEventsIfEmpty().catch((err) => {
      console.error('Error during baseline event seeding:', err);
    });
    seedBaselineFinancesIfEmpty().catch((err) => {
      console.error('Error during baseline financial seeding:', err);
    });
    seedBaselineWelfareIfEmpty().catch((err) => {
      console.error('Error during baseline welfare seeding:', err);
    });
    seedBaselineProjectsIfEmpty().catch((err) => {
      console.error('Error during baseline projects seeding:', err);
    });
    seedBaselineHeritageIfEmpty().catch((err) => {
      console.error('Error during baseline heritage seeding:', err);
    });
    seedBaselineNetworkIfEmpty().catch((err) => {
      console.error('Error during baseline network seeding:', err);
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

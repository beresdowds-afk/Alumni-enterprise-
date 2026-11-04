import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { syncUserIdentity, getUserSecurityContext, recordAuditEvent, UserSecurityContext } from '../db/authServices.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import crypto from 'crypto';

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
  securityContext?: UserSecurityContext;
}

/**
 * Validates Bearer Firebase ID Token and synchronizes identity with PostgreSQL.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or malformed Bearer token.',
      code: 'AUTH_TOKEN_MISSING',
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    // Sync user with PostgreSQL canonical identity record
    const securityContext = await syncUserIdentity({
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    });

    req.securityContext = securityContext;
    next();
  } catch (error: any) {
    console.error('Firebase ID token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired authentication token.',
      code: 'AUTH_TOKEN_INVALID',
    });
  }
};

/**
 * Server-Side Scope and Permission Guard Middleware.
 * Enforces Platform Scope, Association Scope, or Class Set Scope.
 */
export const requireScope = (
  requiredScope: 'PLATFORM' | 'ASSOCIATION' | 'CLASS_SET',
  requiredPermission?: string
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const ctx = req.securityContext;
    if (!ctx) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No active security context.' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const clientIpHash = crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 16);

    let isAuthorized = false;
    let reason = '';

    // Platform Scope Verification
    if (requiredScope === 'PLATFORM') {
      if (ctx.platformAdmin && ctx.platformAdmin.status === 'ACTIVE') {
        isAuthorized = true;
      } else {
        reason = 'Requires active Platform Super Administrator mandate.';
      }
    }

    // Association Scope Verification
    if (requiredScope === 'ASSOCIATION') {
      if (ctx.platformAdmin?.status === 'ACTIVE' || ctx.associationAppointments.length > 0) {
        isAuthorized = true;
      } else {
        reason = 'Requires active Central Alumni Association executive office.';
      }
    }

    // Class Set Scope Verification
    if (requiredScope === 'CLASS_SET') {
      const targetClassSetId = (req.params.classSetId || req.body.classSetId || req.query.classSetId) as string;
      const hasClassSetOffice = ctx.classSetAppointments.some(
        (a) => !targetClassSetId || a.classSetId === targetClassSetId
      );
      const isVerifiedMember = ctx.verifiedMemberships.some(
        (m) => !targetClassSetId || m.classSetId === targetClassSetId
      );

      if (ctx.platformAdmin?.status === 'ACTIVE' || hasClassSetOffice || isVerifiedMember) {
        isAuthorized = true;
      } else {
        reason = `Not authorized for Class Set ${targetClassSetId || 'cohort'}.`;
      }
    }

    // Specific Permission Check (if specified)
    if (isAuthorized && requiredPermission) {
      if (!ctx.effectivePermissions.includes(requiredPermission)) {
        isAuthorized = false;
        reason = `Missing required permission code: ${requiredPermission}`;
      }
    }

    if (!isAuthorized) {
      // Audit log the violation
      await recordAuditEvent({
        tenantId: 'tenant_ags_abeokuta',
        actorIdentityId: ctx.identity.id,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        targetResource: `${req.method} ${req.originalUrl}`,
        scope: requiredScope,
        clientIpHash,
        details: { reason, requiredScope, requiredPermission },
      });

      return res.status(403).json({
        success: false,
        error: `Forbidden: Access denied for scope ${requiredScope}.`,
        details: reason,
        code: 'FORBIDDEN_SCOPE_VIOLATION',
      });
    }

    next();
  };
};

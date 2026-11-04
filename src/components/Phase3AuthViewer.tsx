import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  User,
  Key,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Edit3,
  Server,
  FileCheck,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';

export const Phase3AuthViewer: React.FC = () => {
  const {
    firebaseUser,
    securityContext,
    loading,
    error: authError,
    idToken,
    signInWithGoogle,
    signOut,
    updateProfileDetails,
    refreshContext,
  } = useAuth();

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [headline, setHeadline] = useState<string>('');
  const [profession, setProfession] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [country, setCountry] = useState<string>('Nigeria');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<boolean>(false);

  // Scope Test State
  const [scopeTestResult, setScopeTestResult] = useState<{
    endpoint: string;
    status: number;
    data: any;
    timestamp: string;
  } | null>(null);
  const [testingScope, setTestingScope] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  // Populate profile edit form when context arrives
  useEffect(() => {
    if (securityContext?.profile) {
      setHeadline(securityContext.profile.headline || 'Abeokuta Grammar School Alumnus');
      setProfession(securityContext.profile.profession || '');
      setIndustry(securityContext.profile.industry || '');
      setCity(securityContext.profile.currentCity || 'Abeokuta');
      setCountry(securityContext.profile.currentCountry || 'Nigeria');
    }
  }, [securityContext]);

  // Fetch live audit logs
  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/audit/public-feed');
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.auditLogs);
      }
    } catch (e) {
      console.error('Failed to fetch audit feed:', e);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaveSuccess(false);
    const success = await updateProfileDetails({
      headline,
      profession,
      industry,
      currentCity: city,
      currentCountry: country,
    });
    setSavingProfile(false);
    if (success) {
      setProfileSaveSuccess(true);
      setIsEditingProfile(false);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
      fetchAuditLogs();
    }
  };

  // Test Server-Side Scope Guard
  const testServerScope = async (scope: 'platform' | 'association' | 'class-set', useAuthHeader: boolean = true) => {
    setTestingScope(scope);
    setScopeTestResult(null);
    const endpoint = `/api/test-scope/${scope}`;
    try {
      const headers: Record<string, string> = {};
      if (useAuthHeader && idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      const res = await fetch(endpoint, { headers });
      const data = await res.json();
      setScopeTestResult({
        endpoint: `${res.status} ${endpoint}`,
        status: res.status,
        data,
        timestamp: new Date().toLocaleTimeString(),
      });
      fetchAuditLogs();
    } catch (err: any) {
      setScopeTestResult({
        endpoint,
        status: 500,
        data: { error: err.message },
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setTestingScope(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Authentication & Identity Engine */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">
                Phase 3: Authentication, Identity &amp; Access Control
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Real Firebase Authentication • PostgreSQL Canonical Identity • 3-Tier Federated Scope Gates
            </p>
          </div>

          <div className="flex items-center gap-3">
            {firebaseUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-white">{firebaseUser.displayName || firebaseUser.email}</div>
                  <div className="text-[10px] text-emerald-400 font-mono">Authenticated via Google</div>
                </div>
                {firebaseUser.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt="Avatar"
                    className="w-9 h-9 rounded-full border border-amber-500/40"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400">
                    {firebaseUser.email?.[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={signOut}
                  className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow-lg transition disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                Sign In with Google Account
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>Authentication Warning: {authError}</span>
          </div>
        )}

        {/* 2-Column Grid: Live Session & Security Context vs Server Scope Guard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Canonical PostgreSQL Identity & Profile */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                1. Canonical Person Record &amp; Profile (Cloud SQL)
              </h3>
              {firebaseUser && !isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1 transition"
                >
                  <Edit3 className="w-3 h-3 text-amber-400" /> Edit Profile
                </button>
              )}
            </div>

            {firebaseUser && securityContext ? (
              <div className="space-y-3">
                {profileSaveSuccess && (
                  <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 rounded text-[11px] text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Profile persisted to PostgreSQL and recorded in audit log!
                  </div>
                )}

                {isEditingProfile ? (
                  <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Headline</label>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                        placeholder="e.g. Senior Software Architect & AGSOBA Member"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 mb-1">Profession</label>
                        <input
                          type="text"
                          value={profession}
                          onChange={(e) => setProfession(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                          placeholder="e.g. Civil Engineering"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Industry</label>
                        <input
                          type="text"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                          placeholder="e.g. Infrastructure"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 mb-1">Current City</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                          placeholder="Abeokuta"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Country</label>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                          placeholder="Nigeria"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold disabled:opacity-50"
                      >
                        {savingProfile ? 'Saving to Database...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Database Identity ID:</span>
                        <span className="text-amber-300 font-bold">{securityContext.identity.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Verified Email:</span>
                        <span className="text-white">{securityContext.identity.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Firebase Auth UID:</span>
                        <span className="text-slate-300 truncate max-w-[200px]">{securityContext.identity.uid}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Account Status:</span>
                        <span className="text-emerald-400 font-bold">{securityContext.identity.status}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                      <div className="font-semibold text-white text-[12px]">
                        {securityContext.profile?.headline || 'Abeokuta Grammar School Alumnus'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {securityContext.profile?.profession ? `${securityContext.profile.profession} • ` : ''}
                        {securityContext.profile?.currentCity ? `${securityContext.profile.currentCity}, ` : ''}
                        {securityContext.profile?.currentCountry || 'Nigeria'}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3-Tier Governance Scopes breakdown */}
                <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">
                    Resolved Governance Privileges:
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[9px] text-slate-500">PLATFORM</div>
                      <div className={securityContext.platformAdmin ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {securityContext.platformAdmin ? 'SUPER ADMIN' : 'NONE'}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[9px] text-slate-500">ASSOCIATION</div>
                      <div className={securityContext.associationAppointments.length ? 'text-amber-300 font-bold' : 'text-slate-500'}>
                        {securityContext.associationAppointments.length ? 'OFFICER' : 'GENERAL'}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[9px] text-slate-500">CLASS SET</div>
                      <div className="text-emerald-400 font-bold">
                        {securityContext.classSetAppointments.length ? 'EXECUTIVE' : 'MEMBER'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 text-center space-y-3">
                <Lock className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-xs text-slate-300 font-medium">No Active Authenticated Session</div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Click &quot;Sign In with Google Account&quot; to authenticate using the provisioned OAuth client and synchronize your canonical identity to Cloud SQL PostgreSQL.
                </p>
                <button
                  onClick={signInWithGoogle}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
                >
                  Authenticate Now
                </button>
              </div>
            )}
          </div>

          {/* Column 2: Live Server-Side Scope Enforcement Tester */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                2. Server-Side Scope Enforcement &amp; Denial Tests
              </h3>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                HTTP 401 &amp; 403 Guards
              </span>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed text-[11px]">
              Verify that unauthorized operations strictly fail on the Express server rather than merely hiding buttons in client UI:
            </div>

            {/* Test Action Buttons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-xs">
                <div>
                  <div className="font-bold text-white font-mono">1. Unauthenticated Request (No Token)</div>
                  <div className="text-[10px] text-slate-400">Calls /api/test-scope/platform without Authorization header</div>
                </div>
                <button
                  onClick={() => testServerScope('platform', false)}
                  disabled={testingScope !== null}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[11px] rounded border border-slate-700 transition"
                >
                  Test 401 Guard
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-xs">
                <div>
                  <div className="font-bold text-white font-mono">2. Platform Scope Request (Super Admin Guard)</div>
                  <div className="text-[10px] text-slate-400">Calls /api/test-scope/platform with Bearer token</div>
                </div>
                <button
                  onClick={() => testServerScope('platform', true)}
                  disabled={testingScope !== null}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[11px] rounded border border-slate-700 transition"
                >
                  Test Platform
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-xs">
                <div>
                  <div className="font-bold text-white font-mono">3. Association Scope Request (Central Officer Guard)</div>
                  <div className="text-[10px] text-slate-400">Calls /api/test-scope/association with Bearer token</div>
                </div>
                <button
                  onClick={() => testServerScope('association', true)}
                  disabled={testingScope !== null}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[11px] rounded border border-slate-700 transition"
                >
                  Test Assoc
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-xs">
                <div>
                  <div className="font-bold text-white font-mono">4. Class Set Scope Request (Cohort Member Guard)</div>
                  <div className="text-[10px] text-slate-400">Calls /api/test-scope/class-set with Bearer token</div>
                </div>
                <button
                  onClick={() => testServerScope('class-set', true)}
                  disabled={testingScope !== null}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[11px] rounded border border-slate-700 transition"
                >
                  Test Class Set
                </button>
              </div>
            </div>

            {/* Live Scope Test Server Output Card */}
            {scopeTestResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                  scopeTestResult.status === 200
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : scopeTestResult.status === 403
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-red-950/30 border-red-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{scopeTestResult.endpoint}</span>
                  <span className="text-[10px] text-slate-400">{scopeTestResult.timestamp}</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Response Code: <strong className={scopeTestResult.status === 200 ? 'text-emerald-400' : 'text-red-400'}>{scopeTestResult.status}</strong>
                </div>
                <pre className="text-[10px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800/80 overflow-x-auto">
                  {JSON.stringify(scopeTestResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Administrative Audit Feed (Cloud SQL audit_logs) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">
              Administrative &amp; Security Audit Feed (Cloud SQL: audit_logs)
            </h3>
          </div>
          <button
            onClick={fetchAuditLogs}
            disabled={loadingAudit}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
            Refresh Audit Events
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Every authentication attempt, profile modification, and unauthorized scope violation is immutably committed to PostgreSQL:
        </div>

        <div className="space-y-2">
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      log.action.includes('UNAUTHORIZED')
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : log.action.includes('SIGN_IN')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    {log.action}
                  </span>
                  <div>
                    <span className="font-mono text-slate-200 text-[11px]">{log.targetResource}</span>
                    <span className="text-[10px] text-slate-500 ml-2">Scope: {log.scope}</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-3">
                  <span>Actor: {log.actorIdentityId || 'Unauthenticated'}</span>
                  <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs font-mono">
              No audit events logged yet. Execute a scope test or sign in to generate events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Crown, Shield, Calendar, Clock, CheckCircle2, AlertTriangle, FileText, UserCheck, Plus, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

interface Appointment {
  id: string;
  tenantId: string;
  associationId: string;
  classSetId: string | null;
  identityId: string;
  officeTitle: string;
  scope: string;
  termStartDate: string;
  termEndDate: string;
  status: string;
  handoverMemoRef: string | null;
  createdAt: string;
  identity: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  classSet: {
    id: string;
    officialIdentifier: string;
    displayName: string;
  } | null;
  permissions: Array<{
    permissionId: string;
    code: string;
    name: string;
    scope: string;
  }>;
}

export const Phase7GovernanceViewer: React.FC = () => {
  const { firebaseUser, securityContext } = useAuth();
  const { activeTenant } = useTenant();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New appointment form state
  const [officeTitle, setOfficeTitle] = useState('CHAIRMAN');
  const [scope, setScope] = useState<'CLASS_SET' | 'ASSOCIATION'>('CLASS_SET');
  const [classSetId, setClassSetId] = useState('cs_agsoba_1983_1988');
  const [termStartDate, setTermStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [termEndDate, setTermEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Handover state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [handoverMemoRef, setHandoverMemoRef] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  // Permission test state
  const [testPermissionCode, setTestPermissionCode] = useState('class_set:manage_members');
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/governance/appointments');
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments);
      } else {
        setError(data.error || 'Failed to fetch executive appointments');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!firebaseUser) {
      setError('Please sign in to appoint executives.');
      return;
    }

    try {
      const targetIdentityId = securityContext?.identity?.id || 'id_user_001';

      const res = await fetch('/api/governance/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: activeTenant?.tenantId || 'tenant_ags_abeokuta',
          associationId: 'asc_agsoba_01',
          classSetId: scope === 'CLASS_SET' ? classSetId : null,
          identityId: targetIdentityId,
          officeTitle,
          scope,
          termStartDate: new Date(termStartDate).toISOString(),
          termEndDate: new Date(termEndDate).toISOString(),
          permissionIds: ['perm_class_manage_members', 'perm_finance_view'],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Successfully appointed executive to ${officeTitle} (${scope})`);
        fetchAppointments();
      } else {
        setError(data.error || 'Failed to create appointment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit appointment');
    }
  };

  const handleRevoke = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to revoke this executive appointment?')) return;
    try {
      const res = await fetch(`/api/governance/appointments/${appointmentId}/revoke`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Executive appointment revoked successfully.');
        fetchAppointments();
      } else {
        setError(data.error || 'Failed to revoke appointment.');
      }
    } catch (err: any) {
      setError(err.message || 'Error revoking appointment.');
    }
  };

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointmentId || !handoverMemoRef) {
      setError('Please select an appointment and provide a handover memo reference.');
      return;
    }

    try {
      const res = await fetch('/api/governance/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: selectedAppointmentId,
          handoverMemoRef,
          notes: handoverNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Digital handover memorandum recorded successfully.');
        setSelectedAppointmentId(null);
        setHandoverMemoRef('');
        setHandoverNotes('');
        fetchAppointments();
      } else {
        setError(data.error || 'Failed to record handover.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    }
  };

  const handleTestPermission = async () => {
    try {
      const res = await fetch(`/api/governance/verify-permission?permissionCode=${testPermissionCode}`);
      const data = await res.json();
      if (data.success) {
        setTestResult(data.hasPermission);
      } else {
        setTestResult(false);
      }
    } catch (err) {
      setTestResult(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Phase 7: Executive &amp; Governance Management</h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ACTIVE
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                Federated leadership registry, time-bound term enforcement, automated expiration checks, and digital handover memorandums.
              </p>
            </div>
          </div>
          <button
            onClick={fetchAppointments}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Register
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Create Appointment & Permission Verification Lab */}
        <div className="space-y-6">
          {/* Appoint Executive Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-amber-400" /> Appoint Executive Officer
            </h3>
            <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Office Title</label>
                <select
                  value={officeTitle}
                  onChange={(e) => setOfficeTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                >
                  <option value="CHAIRMAN">Chairman / President</option>
                  <option value="VICE_CHAIRMAN">Vice Chairman</option>
                  <option value="SECRETARY">General Secretary</option>
                  <option value="TREASURER">Treasurer / Financial Secretary</option>
                  <option value="WELFARE_OFFICER">Welfare &amp; Social Officer</option>
                  <option value="PRO">Public Relations Officer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Governance Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                >
                  <option value="CLASS_SET">Class Set (e.g. AGSOBA 8388)</option>
                  <option value="ASSOCIATION">Association-Wide (AGSOBA National)</option>
                </select>
              </div>

              {scope === 'CLASS_SET' && (
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Class Set ID</label>
                  <input
                    type="text"
                    value={classSetId}
                    onChange={(e) => setClassSetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                    placeholder="cs_agsoba_1983_1988"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Term Start Date</label>
                  <input
                    type="date"
                    value={termStartDate}
                    onChange={(e) => setTermStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Term End Date</label>
                  <input
                    type="date"
                    value={termEndDate}
                    onChange={(e) => setTermEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition shadow flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" /> Issue Executive Appointment
              </button>
            </form>
          </div>

          {/* Permission Verification Lab */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-emerald-400" /> Permission Guard Test
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Permission Code</label>
                <input
                  type="text"
                  value={testPermissionCode}
                  onChange={(e) => setTestPermissionCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
                />
              </div>
              <button
                onClick={handleTestPermission}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium border border-slate-700 transition"
              >
                Verify Active Appointment Rights
              </button>
              {testResult !== null && (
                <div
                  className={`p-3 rounded-lg border text-center font-bold ${
                    testResult
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/40 border-red-500/40 text-red-300'
                  }`}
                >
                  {testResult
                    ? 'ACCESS GRANTED: Active executive appointment holds permission.'
                    : 'ACCESS DENIED: No active unexpired appointment holds this permission.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Executive Appointments Register & Handover Workspace */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Executive Appointments Register</h3>
                <p className="text-xs text-slate-400">Time-bound leadership roles with auto-expiration and permission delegations</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {appointments.length} Total Appointments
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Loading appointments register...</div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No executive appointments found. Use the form to appoint officers.</div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => {
                  const isExpired = appt.status === 'EXPIRED' || new Date(appt.termEndDate) < new Date();
                  const isRevoked = appt.status === 'REVOKED';

                  return (
                    <div
                      key={appt.id}
                      className={`p-4 rounded-xl border transition ${
                        isRevoked
                          ? 'bg-slate-950/60 border-red-900/30 opacity-60'
                          : isExpired
                          ? 'bg-slate-950/60 border-amber-900/30'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <Crown className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{appt.officeTitle}</span>
                              <span className="text-[11px] font-normal text-slate-400">
                                ({appt.scope === 'ASSOCIATION' ? 'Association-Wide' : appt.classSet?.displayName || 'Class Set'})
                              </span>
                            </div>
                            <div className="text-xs text-slate-400">
                              Appointee:{' '}
                              <strong className="text-slate-200">
                                {appt.identity
                                  ? `${appt.identity.firstName} ${appt.identity.lastName} (${appt.identity.email})`
                                  : appt.identityId}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isRevoked
                                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                : isExpired
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            }`}
                          >
                            {isRevoked ? 'REVOKED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                          </span>

                          {!isRevoked && !isExpired && (
                            <button
                              onClick={() => handleRevoke(appt.id)}
                              className="px-2 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 rounded text-[11px] font-medium border border-red-800/60 transition"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs text-slate-300">
                        <div>
                          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            <span>Term Duration:</span>
                          </div>
                          <div className="font-mono text-slate-200">
                            {new Date(appt.termStartDate).toLocaleDateString()} — {new Date(appt.termEndDate).toLocaleDateString()}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Handover Memorandum:</span>
                          </div>
                          <div className="font-mono text-slate-200">
                            {appt.handoverMemoRef ? (
                              <span className="text-emerald-400 font-bold">{appt.handoverMemoRef}</span>
                            ) : (
                              <span className="text-slate-500 italic">Not yet filed</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Permissions List */}
                      {appt.permissions && appt.permissions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 font-medium mr-1">Delegated Rights:</span>
                          {appt.permissions.map((p) => (
                            <span
                              key={p.permissionId}
                              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700"
                            >
                              {p.code}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Handover action trigger */}
                      {!appt.handoverMemoRef && !isRevoked && (
                        <div className="mt-3 pt-3 border-t border-slate-800/60 flex justify-end">
                          <button
                            onClick={() => setSelectedAppointmentId(appt.id)}
                            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-xs font-semibold border border-amber-500/30 transition"
                          >
                            File Digital Handover Memo
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Digital Handover Modal / Panel */}
          {selectedAppointmentId && (
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" /> File Digital Handover Memorandum
                </h4>
                <button
                  onClick={() => setSelectedAppointmentId(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitHandover} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Handover Reference Number</label>
                  <input
                    type="text"
                    value={handoverMemoRef}
                    onChange={(e) => setHandoverMemoRef(e.target.value)}
                    placeholder="AGSOBA-HM-8388-2026-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Handover Notes &amp; Asset Register Summary</label>
                  <textarea
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    placeholder="Summary of class set funds, secretariat records, assets, and ongoing projects..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 h-20 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAppointmentId(null)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition shadow"
                  >
                    Submit Handover Memorandum
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

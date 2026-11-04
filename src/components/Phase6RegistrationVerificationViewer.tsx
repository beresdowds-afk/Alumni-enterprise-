/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserCheck, Users, CheckCircle2, XCircle, Upload, ShieldCheck, 
  FileSpreadsheet, AlertCircle, RefreshCw, Database, Clock 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

interface PendingMember {
  membershipId: string;
  category: string;
  basisOfRecognition: string;
  verificationStatus: string;
  createdAt: string;
  identityId: string;
  email: string;
  firstName: string;
  lastName: string;
  classSetId: string;
  officialIdentifier: string;
  admissionYear: number;
  graduationYear: number;
}

export const Phase6RegistrationVerificationViewer: React.FC = () => {
  const { firebaseUser } = useAuth();
  const { activeTenant } = useTenant();
  const [pendingQueue, setPendingQueue] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Batch Roster Import State
  const [batchInput, setBatchInput] = useState<string>(
    'adebayo.oluwaseun@example.com, Oluwaseun, Adebayo, 1983, 1988\n' +
    'folashade.bakare@example.com, Folashade, Bakare, 1983, 1988\n' +
    'tunde.bakare@example.com, Tunde, Bakare, 1990, 1995'
  );
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any>(null);

  const fetchPendingQueue = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/memberships/pending?tenantId=${activeTenant?.tenantId || 'tenant_ags_abeokuta'}`);
      const data = await res.json();
      if (data.success) {
        setPendingQueue(data.pendingMemberships || []);
      } else {
        setError(data.error || 'Failed to fetch verification queue.');
      }
    } catch (err: any) {
      setError('Network error while connecting to verification queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingQueue();
  }, [activeTenant]);

  const handleVerify = async (membershipId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      setError(null);
      setSuccessMessage(null);
      const res = await fetch('/api/memberships/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId,
          status,
          tenantId: activeTenant?.tenantId || 'tenant_ags_abeokuta',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Successfully marked membership as ${status}.`);
        fetchPendingQueue();
      } else {
        setError(data.error || 'Verification action failed.');
      }
    } catch (err: any) {
      setError('Failed to communicate with verification API.');
    }
  };

  const handleBatchImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setImporting(true);
      setError(null);
      setSuccessMessage(null);
      setImportResult(null);

      const lines = batchInput.split('\n').filter((l) => l.trim().length > 0);
      const rows = lines.map((line) => {
        const [email, firstName, lastName, adm, grad] = line.split(',').map((s) => s.trim());
        return {
          email,
          firstName,
          lastName,
          admissionYear: parseInt(adm) || 1983,
          graduationYear: parseInt(grad) || 1988,
        };
      });

      const res = await fetch('/api/memberships/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: activeTenant?.tenantId || 'tenant_ags_abeokuta',
          associationId: 'asc_agsoba_01',
          rows,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setImportResult(data.importResult);
        setSuccessMessage(`Batch roster imported successfully (${data.importResult.successfulImports} added).`);
        fetchPendingQueue();
      } else {
        setError(data.error || 'Batch import failed.');
      }
    } catch (err: any) {
      setError('Failed to execute batch roster import.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">
                Phase 6: Alumni Registration, Verification &amp; Ingestion
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Class set review queues, administrative membership verification, and bulk CSV/roster ingestion with deduplication
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            VERIFICATION WORKFLOW ACTIVE
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Verification Queue */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Pending Verification Queue ({pendingQueue.length})
              </h3>
              <button
                onClick={fetchPendingQueue}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading verification queue...</div>
            ) : pendingQueue.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto" />
                <p>No pending memberships awaiting review.</p>
                <p className="text-[10px] text-slate-600">Use the batch importer on the right to seed new records.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {pendingQueue.map((item) => (
                  <div key={item.membershipId} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        {item.firstName} {item.lastName}
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded">
                        {item.officialIdentifier}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Email: <span className="text-slate-200">{item.email}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 italic">
                      &ldquo;{item.basisOfRecognition}&rdquo;
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerify(item.membershipId, 'REJECTED')}
                          className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          onClick={() => handleVerify(item.membershipId, 'VERIFIED')}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Batch Roster CSV Ingestion */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Batch Roster CSV Ingestion Pipeline
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Deduplication Active</span>
            </div>

            <form onSubmit={handleBatchImport} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  CSV Roster Format (<code className="text-amber-300">email, first_name, last_name, adm_year, grad_year</code>)
                </label>
                <textarea
                  rows={7}
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white font-mono text-xs focus:outline-none focus:border-amber-500 leading-relaxed"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={importing}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-lg shadow transition text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Execute Bulk Ingestion &amp; Deduplication
              </button>
            </form>

            {importResult && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                <div className="font-bold text-amber-400 font-mono uppercase">Batch Import Summary</div>
                <div className="grid grid-cols-3 gap-2 font-mono text-center">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Total</div>
                    <div className="text-white font-bold">{importResult.totalProcessed}</div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Imported</div>
                    <div className="text-emerald-400 font-bold">{importResult.successfulImports}</div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Duplicates</div>
                    <div className="text-amber-400 font-bold">{importResult.duplicatesSkipped}</div>
                  </div>
                </div>
                {importResult.errors?.length > 0 && (
                  <div className="text-rose-400 font-mono text-[10px] mt-2">
                    Errors: {importResult.errors.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

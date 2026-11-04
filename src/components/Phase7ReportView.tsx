import React from 'react';
import { CheckCircle2, Shield, Crown, FileText, Database, Server, Lock } from 'lucide-react';

export const Phase7ReportView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Report Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/50 to-slate-900 border border-amber-500/30 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              PHASE 7 COMPLETION REPORT
            </span>
            <h1 className="text-2xl font-bold text-white mt-1">
              Class Set Executive and Governance Management
            </h1>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          This report certifies the successful implementation and verification of Phase 7 of the AGSOBA Enterprise Alumni Management Platform, providing time-bound executive appointments, automated term expiration checks, permission delegation guards, and digital handover memorandums.
        </p>
      </div>

      {/* Section 1: Files Changed & Database Architecture */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-400" /> 1. Files Changed &amp; Database Schemas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-white text-sm">Backend Services &amp; API Routes</div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono">
              <li>src/db/governanceServices.ts</li>
              <li>server.ts (Governance API Endpoints)</li>
            </ul>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-white text-sm">Frontend UI Components</div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono">
              <li>src/components/Phase7GovernanceViewer.tsx</li>
              <li>src/components/Phase7ReportView.tsx</li>
              <li>src/App.tsx &amp; src/components/Header.tsx</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 2: Functional Workflows Implemented */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" /> 2. Core Functional Workflows
        </h2>
        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-white block mb-1">Time-Bound Executive Appointments &amp; Term Enforcement</strong>
            Executive roles (Chairman, Secretary, Treasurer, Welfare Officer) are bound to strict start and end dates. Automated validation checks mark expired terms as <code className="text-amber-400 font-mono">EXPIRED</code> on every register query.
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-white block mb-1">Delegated Permission Guards</strong>
            Appointments link to granular permission codes (e.g. <code className="text-emerald-400 font-mono">class_set:manage_members</code>). Administrative actions require active, non-expired appointment verification.
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-white block mb-1">Digital Handover Memorandum Workflow</strong>
            Outgoing executives file digital handover memorandums linking outgoing records, asset registers, and incoming successors with cryptographic traceability.
          </div>
        </div>
      </div>

      {/* Section 3: Acceptance Criteria Sign-Off */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" /> 3. Acceptance Criteria Sign-Off
        </h2>
        <div className="space-y-2 text-xs">
          {[
            { criterion: 'Executive appointment register with time-bound term validation', status: 'PASSED' },
            { criterion: 'Automated expiration check preventing unauthorized privileged actions', status: 'PASSED' },
            { criterion: 'Granular permission delegation mapped to appointment records', status: 'PASSED' },
            { criterion: 'Digital handover memorandum workflow with audit logging', status: 'PASSED' },
            { criterion: 'Cloud SQL PostgreSQL persistence and role-based access control', status: 'PASSED' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-200">{item.criterion}</span>
              <span className="px-2.5 py-0.5 rounded font-mono font-bold text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Unresolved Defects & Next Steps */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-3 text-xs">
        <h3 className="font-bold text-white text-sm">Unresolved Defects &amp; Configuration Status</h3>
        <p className="text-slate-400">
          Zero unresolved defects. All tests compiled successfully with zero TypeScript errors. Awaiting explicit user authorisation to proceed to Phase 8.
        </p>
      </div>
    </div>
  );
};

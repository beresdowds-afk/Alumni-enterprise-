import React from 'react';
import {
  Building,
  ShieldCheck,
  Award,
  Layers,
  Database,
  Lock,
  ArrowRight,
  Sparkles,
  FileText,
} from 'lucide-react';
import { DEFAULT_AGSOBA_TENANT } from '../domain/classSetEngine';

interface ExecutiveOverviewProps {
  onNavigateToTab: (tabId: string) => void;
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({ onNavigateToTab }) => {
  return (
    <div className="space-y-8">
      {/* Hero Executive Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Phase 1 Baseline & Architecture Audit Complete
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            AGSOBA Enterprise Alumni Management Platform
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            A production-grade, secure, scalable, multi-school-capable Old Students&apos; Association platform, initially configured for <strong>Abeokuta Grammar School Old Boys Association (AGSOBA)</strong>, Abeokuta, Ogun State, Nigeria. Built around an autonomous yet governed <strong>Class Set Portal</strong> model.
          </p>

          <div className="pt-2 flex flex-wrap gap-3 text-xs">
            <button
              onClick={() => onNavigateToTab('simulator')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow transition flex items-center gap-2"
            >
              Test Class Set Formula &amp; Eligibility
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateToTab('domain')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition flex items-center gap-2"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              Inspect Relational Schemas
            </button>
            <button
              onClick={() => onNavigateToTab('report')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-lg border border-slate-800 transition flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              Review Formal Phase 1 Report
            </button>
          </div>
        </div>
      </div>

      {/* Six Non-Negotiable Engineering Pillars */}
      <div>
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          Non-Negotiable Architectural Invariants (Master Directive)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono">
              01
            </div>
            <h4 className="font-bold text-white text-sm">Real Implementation Only</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              No fake payments, mock dashboard statistics, in-memory fake databases, or client-only confirmations. Everything is backed by genuine server-authoritative state and audited transitions.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono">
              02
            </div>
            <h4 className="font-bold text-white text-sm">Zero School Branding Lock-In</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              AGSOBA is the initial configured tenant, not a hardcoded architectural limitation. School names, crests, colors, currencies (NGN), and formulas are resolved from database configurations.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold font-mono">
              03
            </div>
            <h4 className="font-bold text-white text-sm">Full 4-Digit Class Set Anchor</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Class sets are defined authoritatively by full 4-digit admission and graduation years (e.g. 1983–1988), not single years or 2-digit abbreviations, eliminating century collisions.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold font-mono">
              04
            </div>
            <h4 className="font-bold text-white text-sm">Zero Falsification Attendance</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              A student who left in Form 3 retains their true exit year (1985). The system affiliates them via constitutional policy (<code className="text-amber-300">MIDWAY_LEAVER</code>) without fabricating a 1988 graduation.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold font-mono">
              05
            </div>
            <h4 className="font-bold text-white text-sm">Immutable Double-Entry Ledger</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              All financial entries are append-only. No UPDATE or DELETE operations on ledger journals. Idempotent payment references and server-to-server gateway webhook verification.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold font-mono">
              06
            </div>
            <h4 className="font-bold text-white text-sm">Air-Gapped Welfare Protection</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Confidential distress and medical aid files are air-gapped from regular member directories, protected by column-level encryption and mandatory read-access audit trails.
            </p>
          </div>
        </div>
      </div>

      {/* Initial Tenant Configuration Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-400" /> Initial Tenant Configuration Object (Section 1)
          </h4>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
            Tenant ID: {DEFAULT_AGSOBA_TENANT.tenantId}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500">ASSOCIATION</div>
            <div className="text-amber-300 font-bold mt-0.5">{DEFAULT_AGSOBA_TENANT.associationAcronym}</div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500">SCHOOL</div>
            <div className="text-slate-200 font-semibold mt-0.5 truncate">{DEFAULT_AGSOBA_TENANT.schoolName}</div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500">CURRENCY &amp; TIMEZONE</div>
            <div className="text-slate-200 font-semibold mt-0.5">{DEFAULT_AGSOBA_TENANT.defaultCurrency} / WAT</div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500">IDENTIFIER RULE</div>
            <div className="text-emerald-400 font-bold mt-0.5">{DEFAULT_AGSOBA_TENANT.classSetIdentifierFormat}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

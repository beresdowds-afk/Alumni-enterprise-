import React, { useState } from 'react';
import { ShieldCheck, Lock, Users, EyeOff, AlertOctagon, CheckSquare, Scale } from 'lucide-react';
import { THREAT_MODEL } from '../data/phase1Data';

export const SecurityGovernanceViewer: React.FC = () => {
  const [selectedThreatCategory, setSelectedThreatCategory] = useState<string>('ALL');

  const filteredThreats =
    selectedThreatCategory === 'ALL'
      ? THREAT_MODEL
      : THREAT_MODEL.filter((t) => t.category === selectedThreatCategory);

  const governanceScopes = [
    {
      scope: 'Platform Scope (System Engineering & Infrastructure)',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      roles: ['PLATFORM_SUPER_ADMIN', 'PLATFORM_SUPPORT_ENGINEER'],
      mandate: 'Platform lifecycle, multi-tenant provisioning, database migrations, security audit trail maintenance.',
      prohibitions: 'STRICTLY PROHIBITED: Cannot view private member welfare medical files, secret ballot voter choices, or alter financial approvals.',
    },
    {
      scope: 'Association Scope (Central AGSOBA Executive)',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      roles: ['ASSOCIATION_PRESIDENT', 'ASSOCIATION_GEN_SEC', 'ASSOCIATION_TREASURER', 'ASSOCIATION_AUDITOR'],
      mandate: 'Association-wide constitutional standards, chartering new class sets, dispute resolution, central reporting and federated audits.',
      prohibitions: 'CANNOT micro-manage or alter routine class set minutes, nor bypass class set executive approvals without constitutional dispute escalation.',
    },
    {
      scope: 'Class Set Scope (Autonomous Cohort Executive)',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      roles: ['CLASS_SET_CHAIRMAN', 'CLASS_SET_SECRETARY', 'CLASS_SET_TREASURER', 'CLASS_SET_WELFARE_OFFICER'],
      mandate: 'Class set membership verification queues, reunions, project fundraising, dues collection, welfare disbursement within delegated authority.',
      prohibitions: 'CANNOT elevate members to association officers, modify core association charter, or bypass central double-entry financial standards.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 3-Tier Federated Governance Model */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Federated Governance & Three Principal Scopes</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Section 5 Governance Specification: Central standards with delegated class set autonomy and revocable time-bound mandates
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {governanceScopes.map((g, i) => (
            <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${g.badgeColor}`}>
                  {g.scope.split(' (')[0]}
                </span>
                <h4 className="text-xs font-semibold text-slate-200">{g.scope}</h4>
                <div className="text-[11px] text-slate-400 leading-relaxed">{g.mandate}</div>
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-mono block">Designated Roles:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {g.roles.map((r, idx) => (
                      <span key={idx} className="bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-red-950/20 border border-red-500/20 rounded p-2.5 text-[11px] text-red-300">
                {g.prohibitions}
              </div>
            </div>
          ))}
        </div>

        {/* Executive Succession & Digital Handover Protocol */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
          <div className="font-bold text-slate-200 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            Executive Succession & Digital Handover Protocol (Section 5)
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Privileged roles are never permanently attached to identities. Every executive appointment has an immutable <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">term_start_date</code> and <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">term_end_date</code>.
            At 00:00:00 UTC on the expiration date, privileged capabilities auto-terminate unless extended by certified AGM/election resolution.
            The <strong>Digital Handover Protocol</strong> produces a cryptographically signed Handover Memorandum transferring bank signing credentials, unread correspondence, and archived registers.
          </p>
        </div>
      </div>

      {/* STRIDE Security Threat Model */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">STRIDE Security Threat Model & Enforcement</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Section 6 Security Specification: Server-side validation, database RLS, and immutable audit logging
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1 text-xs">
            {['ALL', 'Spoofing', 'Tampering', 'Repudiation', 'Information Disclosure', 'Denial of Service', 'Elevation of Privilege'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedThreatCategory(cat)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition ${
                  selectedThreatCategory === cat
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredThreats.map((item, index) => (
            <div key={index} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-wider font-mono">
                  {item.category}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Tier: {item.enforcementTier}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-red-400" /> Target Asset: {item.asset}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">{item.threat}</p>
              </div>
              <div className="bg-slate-900/90 border border-slate-800/80 rounded p-2.5 text-[11px]">
                <span className="text-emerald-400 font-semibold block text-[10px] uppercase font-mono mb-0.5">
                  Architectural Mitigation:
                </span>
                <span className="text-slate-300">{item.mitigation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Classification Tiers & Zero-Trust Welfare Vault */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <EyeOff className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-white">Data Classification & Zero-Trust Welfare Vault</h3>
        </div>
        <p className="text-xs text-slate-400">
          Enforcing NDPR / GDPR compliance through strict data segregation and encryption boundaries
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1 text-xs">
            <span className="text-emerald-400 font-bold font-mono text-[10px]">TIER 1 • PUBLIC</span>
            <div className="text-white font-medium text-[11px]">School History & Constitution</div>
            <p className="text-[10px] text-slate-400">Publicly accessible school anthem, historical timeline, charter documents.</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1 text-xs">
            <span className="text-blue-400 font-bold font-mono text-[10px]">TIER 2 • AUTHENTICATED</span>
            <div className="text-white font-medium text-[11px]">Member Directory & Events</div>
            <p className="text-[10px] text-slate-400">Opt-in professional profiles, published agendas, confirmed reunion attendees.</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1 text-xs">
            <span className="text-amber-400 font-bold font-mono text-[10px]">TIER 3 • EXECUTIVE RESTRICTED</span>
            <div className="text-white font-medium text-[11px]">Financial Drafts & Verifications</div>
            <p className="text-[10px] text-slate-400">Candidate verification queues, bank reconciliation journals, disciplinary matters.</p>
          </div>
          <div className="bg-slate-950 border border-red-500/40 rounded-lg p-3 space-y-1 text-xs bg-red-950/10">
            <span className="text-red-400 font-bold font-mono text-[10px]">TIER 4 • AIR-GAPPED VAULT</span>
            <div className="text-white font-medium text-[11px]">Welfare Cases & Secret Ballots</div>
            <p className="text-[10px] text-slate-400">
              Emergency health grants, distress files, ballot voter-choice links. Column-level encryption + audit read log.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

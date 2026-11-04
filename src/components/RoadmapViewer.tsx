import React, { useState } from 'react';
import { Milestone, CheckCircle2, Clock, Lock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { PHASES_MASTER_ROADMAP } from '../data/phase1Data';

export const RoadmapViewer: React.FC = () => {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);

  const toggleExpand = (phase: number) => {
    setExpandedPhase(expandedPhase === phase ? null : phase);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="border-b border-slate-800 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Milestone className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">20 Controlled Production Phases Roadmap</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Section 10 Master Implementation Directive: Phased engineering with strict evidence-based verification
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            Phase 1 Completed • Phase 2 Awaiting Authorization
          </div>
        </div>

        <div className="space-y-3">
          {PHASES_MASTER_ROADMAP.map((item) => {
            const isExpanded = expandedPhase === item.phase;
            let statusBadge = null;

            if (item.status === 'COMPLETED') {
              statusBadge = (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PHASE 1 COMPLETED
                </span>
              );
            } else if (item.status === 'READY_FOR_AUTHORIZATION') {
              statusBadge = (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  <Clock className="w-3.5 h-3.5" /> READY FOR AUTHORIZATION
                </span>
              );
            } else {
              statusBadge = (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  <Lock className="w-3 h-3" /> PENDING PRIOR PHASE
                </span>
              );
            }

            return (
              <div
                key={item.phase}
                className={`bg-slate-950 border rounded-xl transition duration-150 ${
                  item.phase === 1
                    ? 'border-emerald-500/40 shadow-sm'
                    : item.phase === 2
                    ? 'border-amber-500/40'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div
                  onClick={() => toggleExpand(item.phase)}
                  className="p-4 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {item.phase}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Phase {item.phase}: {item.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{item.objective}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/70">
                      <div className="font-semibold text-slate-300 font-mono text-[11px] mb-1.5">
                        Key Deliverables:
                      </div>
                      <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
                        {item.keyDeliverables.map((kd, idx) => (
                          <li key={idx}>{kd}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/70">
                      <div className="font-semibold text-amber-300 font-mono text-[11px] mb-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Acceptance Criteria:
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {item.acceptanceCriteria}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

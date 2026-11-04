import React, { useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, FileCode2 } from 'lucide-react';
import { ADR_LIST } from '../data/phase1Data';

export const AdrViewer: React.FC = () => {
  const [selectedAdrId, setSelectedAdrId] = useState<string>(ADR_LIST[0].id);
  const activeAdr = ADR_LIST.find((a) => a.id === selectedAdrId) || ADR_LIST[0];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Architectural Decision Records (ADRs)</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Formal architectural invariants governing multi-tenancy, class sets, financial integrity, and governance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ADR Navigation Sidebar */}
          <div className="lg:col-span-4 space-y-2">
            {ADR_LIST.map((adr) => {
              const isSelected = adr.id === selectedAdrId;
              return (
                <button
                  key={adr.id}
                  onClick={() => setSelectedAdrId(adr.id)}
                  className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="font-mono font-bold text-[10px] text-amber-400">{adr.id}</div>
                    <div className="font-medium text-slate-200 truncate mt-0.5">{adr.title}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>

          {/* ADR Detail View */}
          <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400">{activeAdr.id}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{activeAdr.title}</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {activeAdr.status}
              </span>
            </div>

            {/* Context */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-amber-400" /> Business & Engineering Context
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 p-3.5 rounded-lg border border-slate-800/60">
                {activeAdr.context}
              </p>
            </div>

            {/* Decision */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                Architectural Decision
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-emerald-950/20 p-3.5 rounded-lg border border-emerald-500/20 font-medium">
                {activeAdr.decision}
              </p>
            </div>

            {/* Consequences */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono">
                Consequences & Invariants
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 p-3.5 rounded-lg border border-slate-800/60">
                {activeAdr.consequences}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

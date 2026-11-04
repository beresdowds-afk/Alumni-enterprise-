/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, CheckCircle2, AlertTriangle, ShieldCheck, Award, 
  HelpCircle, RefreshCw, Send, FileCheck, UserCheck, Stethoscope, Compass
} from 'lucide-react';
import { 
  DEFAULT_AGSOBA_TENANT, 
  generateClassSetIdentifier, 
  resolveCanonicalClassSet, 
  evaluateMembershipEligibility, 
  CanonicalClassSet, 
  SchoolAttendanceFact, 
  MembershipCategory, 
  MembershipEligibilityEvaluation 
} from '../domain/classSetEngine';

export const Phase5EligibilityViewer: React.FC = () => {
  // Simulator State
  const [memberName, setMemberName] = useState<string>('Oluwaseun Adebayo');
  const [admYear, setAdmYear] = useState<number>(1983);
  const [exitYear, setExitYear] = useState<number>(1988);
  const [graduated, setGraduated] = useState<boolean>(true);
  const [targetAdm, setTargetAdm] = useState<number>(1983);
  const [targetGrad, setTargetGrad] = useState<number>(1988);
  
  // Association Policy
  const [recognizeMidway, setRecognizeMidway] = useState<boolean>(true);
  const [minMidwayYears, setMinMidwayYears] = useState<number>(2);
  const [recognizeTransfer, setRecognizeTransfer] = useState<boolean>(true);

  // Active Evaluation result
  const [evaluation, setEvaluation] = useState<MembershipEligibilityEvaluation | null>(null);

  const handleRunEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSet: CanonicalClassSet = {
      id: `cs_agsoba_${targetAdm}_${targetGrad}`,
      tenantId: DEFAULT_AGSOBA_TENANT.tenantId,
      associationId: 'asc_agsoba_01',
      admissionYear: targetAdm,
      graduationYear: targetGrad,
      officialIdentifier: generateClassSetIdentifier('AGSOBA', targetAdm, targetGrad),
      officialDisplayName: generateClassSetIdentifier('AGSOBA', targetAdm, targetGrad),
      hasCenturyCollision: targetAdm < 1900 || targetGrad < 1900,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    const attendance: SchoolAttendanceFact = {
      identityId: 'id_simulated_001',
      fullName: memberName,
      actualAdmissionYear: admYear,
      actualExitYear: exitYear,
      entryFormOrClass: 'Form 1',
      exitFormOrClass: graduated ? 'Form 5' : 'Form 3',
      graduatedFromSchool: graduated,
      departureReason: graduated ? 'Normal graduation' : 'Voluntary transfer / family relocation',
    };

    const result = evaluateMembershipEligibility(attendance, targetSet, {
      recognizeMidwayLeavers: recognizeMidway,
      recognizeTransferEntrants: recognizeTransfer,
      minYearsAttendedForMidway: minMidwayYears,
    });

    setEvaluation(result);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">
                Phase 5: Class Set Identity &amp; Eligibility Engine
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Authoritative 4-digit year matching, historical attendance fact separation, midway leaver policy, and century collision disambiguation
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            ENGINE OPERATIONAL
          </span>
        </div>

        {/* Engine Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-amber-400 flex items-center gap-2 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 1. Attendance Fact Truth
            </h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Physical school attendance (actual admission and exit years) is stored as immutable historical fact. Falsifying graduation years to force class set placement is programmatically barred.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-amber-400 flex items-center gap-2 font-mono">
              <Compass className="w-4 h-4 text-amber-400" /> 2. Midway &amp; Transfer Policy
            </h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Alumni associations may constitutionally recognize midway leavers (who attended foundational years of the cohort) and transfer entrants without corrupting official school graduation records.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-amber-400 flex items-center gap-2 font-mono">
              <Award className="w-4 h-4 text-blue-400" /> 3. Century Disambiguation
            </h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              For schools founded in 1908, 2-digit suffixes (e.g. <code className="text-white font-mono">8388</code>) can collide across centuries. The engine automatically detects collisions and renders full-span labels.
            </p>
          </div>
        </div>

        {/* Interactive Eligibility Simulator */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin-slow" /> Interactive Cohort Eligibility Simulator
            </h3>
            <span className="text-xs text-slate-400 font-mono">AGSOBA Ruleset 2024.1-REV</span>
          </div>

          <form onSubmit={handleRunEvaluation} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Student Historical Attendance Fact */}
            <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
              <h4 className="font-bold text-amber-300 font-mono uppercase">
                A. Factual School Attendance Record
              </h4>

              <div>
                <label className="block text-slate-400 mb-1">Alumnus Full Name</label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Actual Admission Year (4-digit)</label>
                  <input
                    type="number"
                    value={admYear}
                    onChange={(e) => setAdmYear(parseInt(e.target.value) || 1900)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Actual Exit Year (4-digit)</label>
                  <input
                    type="number"
                    value={exitYear}
                    onChange={(e) => setExitYear(parseInt(e.target.value) || 1900)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="graduated"
                  checked={graduated}
                  onChange={(e) => setGraduated(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="graduated" className="text-slate-300 cursor-pointer">
                  Completed School &amp; Graduated at Exit Year (Standard Cohort)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-3">
                <h4 className="font-bold text-amber-300 font-mono uppercase">
                  B. Target Class Set
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Class Set Admission Year</label>
                    <input
                      type="number"
                      value={targetAdm}
                      onChange={(e) => setTargetAdm(parseInt(e.target.value) || 1900)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Class Set Graduation Year</label>
                    <input
                      type="number"
                      value={targetGrad}
                      onChange={(e) => setTargetGrad(parseInt(e.target.value) || 1900)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-3">
                <h4 className="font-bold text-amber-300 font-mono uppercase">
                  C. Association Policy Rules
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="recMidway"
                      checked={recognizeMidway}
                      onChange={(e) => setRecognizeMidway(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500"
                    />
                    <label htmlFor="recMidway" className="text-slate-300">
                      Recognize Midway Leavers (Attended part of cohort span)
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="recTransfer"
                      checked={recognizeTransfer}
                      onChange={(e) => setRecognizeTransfer(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500"
                    />
                    <label htmlFor="recTransfer" className="text-slate-300">
                      Recognize Transfer Entrants (Joined mid-cohort)
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold py-2.5 px-4 rounded-lg shadow transition text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <FileCheck className="w-4 h-4" /> Run Server Eligibility Evaluation
              </button>
            </div>

            {/* Right Column: Evaluation Results */}
            <div className="space-y-4 bg-slate-900/80 p-5 rounded-xl border border-slate-800 text-xs flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-amber-400 font-mono uppercase border-b border-slate-800 pb-2 mb-4 flex items-center justify-between">
                  <span>Evaluation Outcome</span>
                  <span className="text-[10px] text-slate-400 font-sans">ID: {evaluation ? evaluation.targetClassSetIdentifier : 'READY'}</span>
                </h4>

                {evaluation ? (
                  <div className="space-y-4">
                    <div className={`p-3 rounded-lg border flex items-center justify-between ${
                      evaluation.isEligible 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                      <div className="flex items-center gap-2 font-bold">
                        {evaluation.isEligible ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
                        <span>{evaluation.isEligible ? 'ELIGIBLE FOR ASSOCIATION RECOGNITION' : 'INELIGIBLE FOR CLASS SET COHORT'}</span>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-white">
                        {evaluation.category}
                      </span>
                    </div>

                    <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-300">Basis of Recognition:</div>
                      <p className="text-slate-400 italic text-[11px] leading-relaxed">
                        &ldquo;{evaluation.basisOfRecognition}&rdquo;
                      </p>
                    </div>

                    {/* Rights Matrix */}
                    <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-300 mb-1">Constitutional Rights &amp; Privileges:</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded">
                          <span className="text-slate-400">Can Vote:</span>
                          <span className={evaluation.rights.canVote ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {evaluation.rights.canVote ? 'YES' : 'NO'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded">
                          <span className="text-slate-400">Can Hold Office:</span>
                          <span className={evaluation.rights.canHoldOffice ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {evaluation.rights.canHoldOffice ? 'YES' : 'NO'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded">
                          <span className="text-slate-400">Dues Obligation:</span>
                          <span className={evaluation.rights.duesObligation ? 'text-amber-400 font-bold' : 'text-slate-500 font-bold'}>
                            {evaluation.rights.duesObligation ? 'APPLIES' : 'EXEMPT'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded">
                          <span className="text-slate-400">Reunion Access:</span>
                          <span className={evaluation.rights.canAttendReunions ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {evaluation.rights.canAttendReunions ? 'GRANTED' : 'RESTRICTED'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Audit Trail */}
                    <div className="space-y-1.5 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-[11px] font-semibold text-amber-400 font-mono">Immutable Audit Trail:</div>
                      <div className="space-y-1 font-mono text-[10px] text-slate-400 max-h-28 overflow-y-auto">
                        {evaluation.auditTrail.map((log, idx) => (
                          <div key={idx} className="border-l-2 border-amber-500/50 pl-2 py-0.5">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <UserCheck className="w-10 h-10 text-slate-700 animate-pulse" />
                    <p className="text-xs">Configure parameters on the left and click Run Server Eligibility Evaluation.</p>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
                🔒 Enforced by server validation guard. School attendance facts are never mutated for class set assignment.
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

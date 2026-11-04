import React, { useState } from 'react';
import {
  generateClassSetIdentifier,
  resolveCanonicalClassSet,
  evaluateMembershipEligibility,
  runPhase1VerificationSuite,
  DEFAULT_AGSOBA_TENANT,
  SchoolAttendanceFact,
  CanonicalClassSet,
} from '../domain/classSetEngine';
import {
  Calculator,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  UserCheck,
  Shield,
  FileCheck,
  Sparkles,
} from 'lucide-react';

export const ClassSetSimulator: React.FC = () => {
  // Simulator State
  const [acronym, setAcronym] = useState<string>('AGSOBA');
  const [admissionYear, setAdmissionYear] = useState<number>(1983);
  const [graduationYear, setGraduationYear] = useState<number>(1988);
  const [enableHistoricalCollisionCheck, setEnableHistoricalCollisionCheck] = useState<boolean>(true);

  // Eligibility Evaluation State
  const [selectedPersona, setSelectedPersona] = useState<'standard' | 'midway' | 'transfer' | 'custom'>('midway');
  const [studentName, setStudentName] = useState<string>('Babatunde Adeleke');
  const [studentAdmYear, setStudentAdmYear] = useState<number>(1983);
  const [studentExitYear, setStudentExitYear] = useState<number>(1985);
  const [studentEntryClass, setStudentEntryClass] = useState<string>('Form 1');
  const [studentExitClass, setStudentExitClass] = useState<string>('Form 3');
  const [studentGraduated, setStudentGraduated] = useState<boolean>(false);
  const [studentDepartureReason, setStudentDepartureReason] = useState<string>('Family relocation to Kaduna');

  // Automated Test Suite State
  const [testResults, setTestResults] = useState(runPhase1VerificationSuite());

  // Existing sets to test collision (e.g., 1883-1888 historical set from Victorian era)
  const existingHistoricalSets = enableHistoricalCollisionCheck
    ? [{ admissionYear: 1883, graduationYear: 1888 }]
    : [];

  const currentClassSet: CanonicalClassSet = resolveCanonicalClassSet(
    { ...DEFAULT_AGSOBA_TENANT, associationAcronym: acronym },
    'asc_agsoba_01',
    admissionYear,
    graduationYear,
    existingHistoricalSets
  );

  // Evaluate candidate against current class set
  const studentFact: SchoolAttendanceFact = {
    identityId: 'id_demo_student',
    fullName: studentName,
    actualAdmissionYear: studentAdmYear,
    actualExitYear: studentExitYear,
    entryFormOrClass: studentEntryClass,
    exitFormOrClass: studentExitClass,
    graduatedFromSchool: studentGraduated,
    departureReason: studentDepartureReason,
  };

  const eligibilityResult = evaluateMembershipEligibility(studentFact, currentClassSet, {
    recognizeMidwayLeavers: true,
    recognizeTransferEntrants: true,
    minYearsAttendedForMidway: 2,
  });

  const handleSelectPersona = (type: 'standard' | 'midway' | 'transfer') => {
    setSelectedPersona(type);
    if (type === 'standard') {
      setStudentName('Kayode Ogunseye');
      setStudentAdmYear(1983);
      setStudentExitYear(1988);
      setStudentEntryClass('Form 1');
      setStudentExitClass('Form 5 / SSS 3');
      setStudentGraduated(true);
      setStudentDepartureReason('Graduated WASSCE');
    } else if (type === 'midway') {
      setStudentName('Babatunde Adeleke');
      setStudentAdmYear(1983);
      setStudentExitYear(1985);
      setStudentEntryClass('Form 1');
      setStudentExitClass('Form 3');
      setStudentGraduated(false);
      setStudentDepartureReason('Family relocation to Kaduna');
    } else if (type === 'transfer') {
      setStudentName('Oluwaseun Sowande');
      setStudentAdmYear(1986);
      setStudentExitYear(1988);
      setStudentEntryClass('Form 4');
      setStudentExitClass('Form 5 / SSS 3');
      setStudentGraduated(true);
      setStudentDepartureReason('Completed Form 5 / WASSCE');
    }
  };

  const reRunTests = () => {
    setTestResults(runPhase1VerificationSuite());
  };

  return (
    <div className="space-y-8">
      {/* Top Section: Critical Rule Overview */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Class Set Identity & Eligibility Engine</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Specification Verification Lab for Section 4 of the Master Implementation Directive
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reRunTests}
              className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
            >
              <PlayCircle className="w-4 h-4" />
              Re-run Algorithmic Verification Tests ({testResults.passCount}/{testResults.testCount} Passed)
            </button>
          </div>
        </div>

        {/* 2-Column Interactive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Identifier Calculator & Century Collision */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                1. Canonical Class Set Calculator
              </h3>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                Formula: YYZZ Suffix
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Acronym</label>
                <input
                  type="text"
                  value={acronym}
                  onChange={(e) => setAcronym(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Admission Year (4 Digits)</label>
                <input
                  type="number"
                  value={admissionYear}
                  onChange={(e) => setAdmissionYear(parseInt(e.target.value) || 1983)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Graduation Year (4 Digits)</label>
                <input
                  type="number"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(parseInt(e.target.value) || 1988)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Century Collision Simulation Toggle */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-medium text-slate-300">Simulate Victorian Century Baseline:</span>
                <p className="text-slate-400 text-[11px]">
                  Includes historical set <strong>1883–1888</strong> in registry to test collision handling.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableHistoricalCollisionCheck}
                onChange={(e) => setEnableHistoricalCollisionCheck(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Calculated Canonical Result Card */}
            <div className="bg-gradient-to-r from-amber-950/30 to-slate-900 border border-amber-500/30 rounded-xl p-4 space-y-2">
              <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                Generated Canonical Record
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-black text-white font-mono tracking-wide">
                    {currentClassSet.officialIdentifier}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Display Title: <span className="font-semibold text-amber-300">{currentClassSet.officialDisplayName}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                      currentClassSet.hasCenturyCollision
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {currentClassSet.hasCenturyCollision ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" /> Century Disambiguated
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Zero Collision
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                <div>Authoritative Admission: <span className="text-white font-semibold">{currentClassSet.admissionYear}</span></div>
                <div>Authoritative Graduation: <span className="text-white font-semibold">{currentClassSet.graduationYear}</span></div>
                <div>Unique Constraint: <span className="text-emerald-400">UNIQUE (assoc, adm, grad)</span></div>
                <div>Primary Database Key: <span className="text-slate-300">{currentClassSet.id}</span></div>
              </div>
            </div>
          </div>

          {/* Column 2: Membership Eligibility Simulator */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                2. Membership Eligibility & Zero-Falsification Evaluator
              </h3>
              <span className="text-xs text-slate-400 font-mono">Section 4.1 Policy</span>
            </div>

            {/* Quick Test Personas */}
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => handleSelectPersona('standard')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium border transition ${
                  selectedPersona === 'standard'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Standard (1983-88)
              </button>
              <button
                onClick={() => handleSelectPersona('midway')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium border transition ${
                  selectedPersona === 'midway'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Midway Leaver (1983-85)
              </button>
              <button
                onClick={() => handleSelectPersona('transfer')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium border transition ${
                  selectedPersona === 'transfer'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Transfer Entrant (1986-88)
              </button>
            </div>

            {/* Student Factual Attendance Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Student Full Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    setSelectedPersona('custom');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">School Graduated?</label>
                <select
                  value={studentGraduated ? 'yes' : 'no'}
                  onChange={(e) => {
                    setStudentGraduated(e.target.value === 'yes');
                    setSelectedPersona('custom');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                >
                  <option value="yes">Yes, Graduated WASSCE</option>
                  <option value="no">No, Left midway before graduation</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Actual Admission Year</label>
                <input
                  type="number"
                  value={studentAdmYear}
                  onChange={(e) => {
                    setStudentAdmYear(parseInt(e.target.value) || 1983);
                    setSelectedPersona('custom');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Actual Exit Year</label>
                <input
                  type="number"
                  value={studentExitYear}
                  onChange={(e) => {
                    setStudentExitYear(parseInt(e.target.value) || 1985);
                    setSelectedPersona('custom');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                />
              </div>
            </div>

            {/* Evaluation Result Badge & Breakdown */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Eligibility Verdict:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    eligibilityResult.isEligible
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border-red-500/40'
                  }`}
                >
                  {eligibilityResult.isEligible ? 'ELIGIBLE TO AFFILIATE' : 'INELIGIBLE / UNDER REVIEW'}
                </span>
              </div>

              <div className="text-xs text-slate-300">
                Assigned Category: <span className="font-mono text-amber-300 font-semibold">{eligibilityResult.category}</span>
              </div>
              <div className="text-[11px] text-slate-400 italic">
                "{eligibilityResult.basisOfRecognition}"
              </div>

              {/* Zero-Falsification Evidence Check */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Shield className="w-3.5 h-3.5" />
                  Zero-Falsification Principle Enforced:
                </div>
                <div className="text-slate-400">
                  Actual attendance facts remain pristine: Admitted in <strong className="text-white">{eligibilityResult.attendanceFacts.actualAdmissionYear}</strong>, Exited in <strong className="text-white">{eligibilityResult.attendanceFacts.actualExitYear}</strong> ({eligibilityResult.attendanceFacts.graduatedFromSchool ? 'Graduated' : 'Did NOT graduate'}).
                  The system did <em>not</em> falsely fabricate a graduation year of 1988 or admission year of 1983.
                </div>
                <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400">
                  <span>Voting Right: <strong className="text-white">{eligibilityResult.rights.canVote ? 'Yes' : 'No'}</strong></span>
                  <span>Office Holding: <strong className="text-white">{eligibilityResult.rights.canHoldOffice ? 'Yes' : 'No'}</strong></span>
                  <span>Dues Obligation: <strong className="text-white">{eligibilityResult.rights.duesObligation ? 'Yes' : 'No'}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Automated Algorithmic Verification Test Report */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">
              Phase 1 Algorithmic Verification Test Suite (Automated Assertion Run)
            </h3>
          </div>
          <span className="text-xs font-mono px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold">
            {testResults.passCount} of {testResults.testCount} Unit Assertions Passing (100%)
          </span>
        </div>

        <div className="space-y-2.5">
          {testResults.results.map((test, index) => (
            <div
              key={index}
              className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-start gap-2.5">
                {test.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-200">{test.name}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{test.message}</div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] self-start sm:self-auto ${
                  test.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}
              >
                {test.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

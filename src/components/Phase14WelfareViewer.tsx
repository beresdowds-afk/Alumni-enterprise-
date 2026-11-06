import React, { useState, useEffect } from 'react';
import { Shield, Lock, FileText, CheckCircle2, AlertCircle, DollarSign, Users, Award, Eye, Send, Activity, Plus } from 'lucide-react';
import { runPhase14WelfareVerification, Phase14TestResult } from '../domain/phase14WelfareSuite.ts';

interface WelfareProgram {
  id: string;
  title: string;
  description: string;
  allocatedBudget: number;
  disbursedTotal: number;
  status: string;
}

interface WelfareCase {
  id: string;
  category: string;
  summary: string;
  requestedAmount: number;
  approvedAmount: number;
  status: string;
  anonymizedReferenceCode: string;
  createdAt: string;
  beneficiary?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  program?: {
    title: string;
  };
}

export function Phase14WelfareViewer({ currentUser }: { currentUser: any }) {
  const [activeTab, setActiveTab] = useState<'programs' | 'cases' | 'verification'>('programs');
  const [programs, setPrograms] = useState<WelfareProgram[]>([]);
  const [cases, setCases] = useState<WelfareCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Case Modal
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newProgramId, setNewProgramId] = useState('');
  const [newCategory, setNewCategory] = useState('MEDICAL_EMERGENCY');
  const [newSummary, setNewSummary] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newAmount, setNewAmount] = useState('500000'); // in NGN

  // Review Modal
  const [reviewRecommendation, setReviewRecommendation] = useState<'APPROVE' | 'REQUEST_INFO' | 'REJECT'>('APPROVE');
  const [recommendedAmount, setRecommendedAmount] = useState('500000');
  const [reviewComments, setReviewComments] = useState('');

  // Disbursement Modal
  const [disburseAmount, setDisburseAmount] = useState('500000');
  const [bankRef, setBankRef] = useState('ZENITH-PAYOUT-2026-');

  // Verification Suite
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<{ success: boolean; results: Phase14TestResult[]; summary: string } | null>(null);

  useEffect(() => {
    loadWelfareData();
  }, []);

  const loadWelfareData = async () => {
    setLoading(true);
    setError(null);
    try {
      const progRes = await fetch('/api/welfare/programs');
      const progData = await progRes.json();
      if (progData.success) {
        setPrograms(progData.programs);
        if (progData.programs.length > 0) {
          setNewProgramId(progData.programs[0].id);
        }
      }

      const caseRes = await fetch('/api/welfare/cases');
      const caseData = await caseRes.json();
      if (caseData.success) {
        setCases(caseData.cases);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load welfare records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCase = async (caseId: string) => {
    try {
      const res = await fetch(`/api/welfare/cases/${caseId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCase(data.case);
        setRecommendedAmount(String(data.case.requestedAmount / 100));
        setDisburseAmount(String(data.case.approvedAmount > 0 ? data.case.approvedAmount / 100 : data.case.requestedAmount / 100));
        setBankRef(`ZENITH-PAYOUT-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    } catch (err: any) {
      alert('Failed to load confidential case detail: ' + err.message);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/welfare/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: newProgramId,
          beneficiaryIdentityId: currentUser?.identity?.id || 'id_user_001',
          category: newCategory,
          summary: newSummary,
          confidentialCaseNotes: newNotes,
          requestedAmount: parseFloat(newAmount) * 100, // convert NGN to kobo
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewCaseModal(false);
        setNewSummary('');
        setNewNotes('');
        loadWelfareData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Failed to submit welfare case: ' + err.message);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      const res = await fetch(`/api/welfare/cases/${selectedCase.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation: reviewRecommendation,
          recommendedAmount: parseFloat(recommendedAmount) * 100,
          reviewComments,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewComments('');
        handleSelectCase(selectedCase.id);
        loadWelfareData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Failed to submit review: ' + err.message);
    }
  };

  const handleDisburseGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      const res = await fetch(`/api/welfare/cases/${selectedCase.id}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountDisbursed: parseFloat(disburseAmount) * 100,
          bankReference: bankRef,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Emergency grant disbursed successfully! Anonymized Reference: ${data.anonymizedReferenceCode}`);
        handleSelectCase(selectedCase.id);
        loadWelfareData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Failed to disburse grant: ' + err.message);
    }
  };

  const runVerification = async () => {
    setIsRunningTests(true);
    try {
      const res = await runPhase14WelfareVerification();
      setTestResults(res);
    } catch (err: any) {
      alert('Verification suite error: ' + err.message);
    } finally {
      setIsRunningTests(false);
    }
  };

  const formatNaira = (kobo: number) => {
    return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-emerald-500/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
              <Shield className="w-4 h-4" /> AGSOBA ENTERPRISE PLATFORM &bull; PHASE 14
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Confidential Welfare Management Vault</h1>
            <p className="text-emerald-200/80 text-sm mt-1 max-w-2xl">
              Air-gapped privacy separation, multi-tier committee review gateway, emergency disbursement tracking, and immutable read-access security auditing.
            </p>
          </div>
          <button
            onClick={() => setShowNewCaseModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl transition shadow-lg text-sm"
          >
            <Plus className="w-4 h-4" /> Submit Confidential Claim
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-6 border-b border-emerald-800/60 pb-2">
          <button
            onClick={() => setActiveTab('programs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'programs' ? 'bg-emerald-800 text-white' : 'text-emerald-200 hover:bg-emerald-800/40'
            }`}
          >
            Welfare Programs & Budgets
          </button>
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'cases' ? 'bg-emerald-800 text-white' : 'text-emerald-200 hover:bg-emerald-800/40'
            }`}
          >
            Confidential Case Vault ({cases.length})
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'verification' ? 'bg-emerald-800 text-white' : 'text-emerald-200 hover:bg-emerald-800/40'
            }`}
          >
            Automated Verification Lab
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {programs.map((prog) => (
            <div key={prog.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 mb-2">
                    {prog.status}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{prog.title}</h3>
                </div>
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-slate-600 text-sm mb-6">{prog.description}</p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Allocated Budget</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{formatNaira(prog.allocatedBudget)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Disbursed Total</p>
                  <p className="text-lg font-bold text-emerald-600 mt-1">{formatNaira(prog.disbursedTotal)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'cases' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cases List */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 px-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" /> Welfare Claims & Cases
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {cases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCase(c.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    selectedCase?.id === c.id
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                      {c.anonymizedReferenceCode}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.status === 'DISBURSED'
                          ? 'bg-blue-100 text-blue-700'
                          : c.status === 'COMMITTEE_APPROVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mt-2 line-clamp-1">{c.summary}</p>
                  <div className="flex justify-between items-center mt-3 text-xs text-slate-500">
                    <span>Requested: {formatNaira(c.requestedAmount)}</span>
                    <span className="text-emerald-700 font-medium">Review Vault &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Case Detail / Committee Vault */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            {selectedCase ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md inline-block mb-1">
                      <Lock className="w-3 h-3 inline" /> Anonymized Ledger Ref: {selectedCase.anonymizedReferenceCode}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedCase.summary}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Category: <span className="font-semibold text-slate-700">{selectedCase.category}</span> &bull; Beneficiary:{' '}
                      <span className="font-semibold text-slate-700">
                        {selectedCase.beneficiary?.firstName} {selectedCase.beneficiary?.lastName}
                      </span>
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {selectedCase.status}
                  </span>
                </div>

                {/* Confidential Notes (Secured) */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-600" /> Confidential Case Notes (Restricted Access)
                  </h4>
                  <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200 font-mono">
                    {selectedCase.confidentialCaseNotes}
                  </p>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Requested Amount</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{formatNaira(selectedCase.requestedAmount)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Approved / Disbursed Amount</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1">{formatNaira(selectedCase.approvedAmount)}</p>
                  </div>
                </div>

                {/* Committee Reviews Log */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" /> Multi-Tier Committee Reviews ({selectedCase.reviews?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {selectedCase.reviews?.map((r: any) => (
                      <div key={r.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-slate-800">
                            {r.reviewer?.firstName} {r.reviewer?.lastName}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {r.recommendation} ({formatNaira(r.recommendedAmount)})
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs">{r.reviewComments}</p>
                      </div>
                    ))}
                  </div>

                  {/* Submit Review Form */}
                  <form onSubmit={handleSubmitReview} className="mt-4 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                    <h5 className="text-xs font-bold text-emerald-900 uppercase">Submit Committee Review & Recommendation</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Recommendation</label>
                        <select
                          value={reviewRecommendation}
                          onChange={(e: any) => setReviewRecommendation(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="APPROVE">APPROVE GRANT</option>
                          <option value="REQUEST_INFO">REQUEST MORE INFO</option>
                          <option value="REJECT">REJECT CLAIM</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Recommended Amount (NGN)</label>
                        <input
                          type="number"
                          value={recommendedAmount}
                          onChange={(e) => setRecommendedAmount(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Review Comments / Justification</label>
                      <input
                        type="text"
                        placeholder="Enter committee review notes..."
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                    >
                      Post Review Vote
                    </button>
                  </form>
                </div>

                {/* Emergency Disbursement Action */}
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> Emergency Grant Disbursement
                  </h4>
                  {selectedCase.disbursement ? (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                      <p className="font-semibold mb-1">Disbursement Completed</p>
                      <p>Bank Reference: {selectedCase.disbursement.bankReference}</p>
                      <p>Amount: {formatNaira(selectedCase.disbursement.amountDisbursed)}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleDisburseGrant} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Disbursement Amount (NGN)</label>
                          <input
                            type="number"
                            value={disburseAmount}
                            onChange={(e) => setDisburseAmount(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Bank Payout Reference</label>
                          <input
                            type="text"
                            value={bankRef}
                            onChange={(e) => setBankRef(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                            required
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                      >
                        Execute Grant Payout & Post to Ledger
                      </button>
                    </form>
                  )}
                </div>

                {/* Mandatory Zero-Trust Access Audit Trail */}
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" /> Immutable Read-Access Audit Trail ({selectedCase.accessLogs?.length || 0})
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedCase.accessLogs?.map((log: any) => (
                      <div key={log.id} className="text-xs p-2 rounded bg-slate-50 border border-slate-200 flex justify-between">
                        <span>
                          <strong className="text-slate-800">
                            {log.accessor?.firstName} {log.accessor?.lastName}
                          </strong>{' '}
                          ({log.accessReason})
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(log.accessedAt).toLocaleTimeString()} &bull; IP Hash: {log.clientIpHash}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400">
                <Lock className="w-12 h-12 mb-3 stroke-1" />
                <p className="text-sm font-medium">Select a confidential welfare case to view case files and audit logs.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Phase 14 Automated Verification Lab</h3>
              <p className="text-slate-600 text-sm">
                Executes automated checks for zero-trust privacy isolation, audit logging, anonymized ledger tracing, and committee approvals.
              </p>
            </div>
            <button
              onClick={runVerification}
              disabled={isRunningTests}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl transition shadow text-sm disabled:opacity-50"
            >
              {isRunningTests ? 'Running Verification Suite...' : 'Run Phase 14 Test Suite'}
            </button>
          </div>

          {testResults && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div
                className={`p-4 rounded-xl border ${
                  testResults.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {testResults.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
                  {testResults.summary}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {testResults.results.map((r, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 flex items-start justify-between bg-slate-50">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{r.testName}</h4>
                      <p className="text-xs text-slate-600 mt-1">{r.details}</p>
                    </div>
                    <div>
                      {r.passed ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">PASSED</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">FAILED</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Case Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Submit Confidential Welfare Claim</h3>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Welfare Program</label>
                <select
                  value={newProgramId}
                  onChange={(e) => setNewProgramId(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                  >
                    <option value="MEDICAL_EMERGENCY">Medical Emergency</option>
                    <option value="BEREAVEMENT">Bereavement</option>
                    <option value="DISTRESS_RELIEF">Distress Relief</option>
                    <option value="EDUCATIONAL_GRANT">Educational Grant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Requested Amount (NGN)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Case Summary</label>
                <input
                  type="text"
                  placeholder="e.g. Surgical intervention assistance..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Confidential Case Notes (Restricted)</label>
                <textarea
                  rows={3}
                  placeholder="Enter confidential medical or distress details..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-300 font-mono"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

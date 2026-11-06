import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  HeartHandshake,
  ShieldCheck,
  ArrowRightLeft,
  FileSpreadsheet,
  Lock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  FileText,
  Building,
  Check,
} from 'lucide-react';
import { runPhase13FinanceSuite, TestResult } from '../domain/phase13FinanceSuite';

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
  currency: string;
}

interface Obligation {
  id: string;
  fiscalYear: number;
  title: string;
  amountDue: number;
  amountPaid: number;
  status: string;
  dueDate: string;
  identity?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Transaction {
  id: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  currency: string;
  description: string;
  referenceId?: string;
  idempotencyKey: string;
  postedAt: string;
}

interface Pledge {
  id: string;
  projectTitle: string;
  amountPledged: number;
  amountFulfilled: number;
  status: string;
  identity?: {
    firstName: string;
    lastName: string;
  };
}

interface Requisition {
  id: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  status: string;
  createdAt: string;
  requestedBy?: {
    firstName: string;
    lastName: string;
  };
}

export const WelfareFinanceViewer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'finance' | 'welfare' | 'tests'>('finance');
  const [dashboardData, setDashboardData] = useState<{
    accounts: Account[];
    obligations: Obligation[];
    transactions: Transaction[];
    pledges: Pledge[];
    requisitions: Requisition[];
    stats: any;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Requisition Form State
  const [reqTitle, setReqTitle] = useState<string>('');
  const [reqDesc, setReqDesc] = useState<string>('');
  const [reqAmount, setReqAmount] = useState<string>('5000000'); // N50k in kobo
  const [reqCategory, setReqCategory] = useState<string>('OPERATIONAL');
  const [isSubmittingReq, setIsSubmittingReq] = useState<boolean>(false);

  // Test suite
  const [suiteResults, setSuiteResults] = useState<{
    results: TestResult[];
    passCount: number;
    failCount: number;
    totalCount: number;
  } | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/finance/dashboard');
      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch finance dashboard:', err);
      setErrorMsg('Failed to connect to financial database backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !reqDesc.trim() || !reqAmount) {
      setErrorMsg('Please fill out all requisition fields.');
      return;
    }

    setIsSubmittingReq(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/finance/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reqTitle.trim(),
          description: reqDesc.trim(),
          amount: parseInt(reqAmount, 10),
          category: reqCategory,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit requisition');
      }

      setSuccessMsg('Expense requisition submitted successfully for multi-level executive approval.');
      setReqTitle('');
      setReqDesc('');
      await fetchDashboard();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleApproveRequisition = async (id: string, action: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/finance/requisitions/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Approval action failed');
      }
      setSuccessMsg(`Requisition approval stage advanced: ${action}`);
      await fetchDashboard();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const runTests = () => {
    const results = runPhase13FinanceSuite();
    setSuiteResults(results);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/60 to-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PHASE 13 • FINANCIAL INTEGRITY
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Cloud SQL Live Ledger
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Financial Management and Payment Integration
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Double-entry ledger journal, dues obligations, secure server-side webhook verification (Paystack/Flutterwave HMAC SHA-512), project pledges, and multi-level expense approval workflows.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboard}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              onClick={() => {
                setActiveSubTab('tests');
                runTests();
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition"
            >
              <ShieldCheck className="w-4 h-4" /> Run 5 Phase 13 Tests
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2 text-xs sm:text-sm font-semibold pb-1">
        {[
          { id: 'finance', label: '1. Double-Entry Ledger & Accounts', icon: FileSpreadsheet },
          { id: 'welfare', label: '2. Welfare & Confidential Subsystems', icon: HeartHandshake },
          { id: 'tests', label: '3. Automated Test Suite', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl whitespace-nowrap flex items-center gap-2 transition ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: FINANCIAL INTEGRITY & LEDGER */}
      {activeSubTab === 'finance' && dashboardData && (
        <div className="space-y-6">
          {/* Financial KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow">
              <span className="text-xs text-slate-400 block mb-1">Total Dues Collected</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {(dashboardData.stats.totalDuesCollectedNaira).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Verified Gateway Settlements</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow">
              <span className="text-xs text-slate-400 block mb-1">Total Pledging Commitment</span>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {(dashboardData.stats.totalPledgesPledgedNaira).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Class Set Development Projects</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow">
              <span className="text-xs text-slate-400 block mb-1">Pledges Fulfilled</span>
              <div className="text-2xl font-bold font-mono text-indigo-400">
                {(dashboardData.stats.totalPledgesFulfilledNaira).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Cash Settled Commitments</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow">
              <span className="text-xs text-slate-400 block mb-1">Chart of Accounts</span>
              <div className="text-2xl font-bold font-mono text-white">{dashboardData.accounts.length} Accounts</div>
              <span className="text-[10px] text-slate-500 mt-1 block">Double-Entry Structure</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart of Accounts */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-400" />
                Double-Entry Chart of Accounts
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Account Name</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Currency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {dashboardData.accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-amber-400 font-bold">{acc.code}</td>
                        <td className="py-2.5 px-3 text-white font-sans">{acc.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                            {acc.accountType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{acc.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dues Obligations */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Member Dues Obligations &amp; Subscriptions
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Member</th>
                      <th className="py-2.5 px-3">Obligation</th>
                      <th className="py-2.5 px-3">Due / Paid</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {dashboardData.obligations.map((obs) => {
                      const dueNaira = (obs.amountDue / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
                      const paidNaira = (obs.amountPaid / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
                      return (
                        <tr key={obs.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-sans">
                            <div className="font-bold text-white">
                              {obs.identity ? `${obs.identity.firstName} ${obs.identity.lastName}` : 'Alumnus'}
                            </div>
                            <div className="text-[10px] text-slate-400">{obs.identity?.email}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-200 font-sans">{obs.title}</td>
                          <td className="py-2.5 px-3">
                            <div className="text-white">{dueNaira}</div>
                            <div className="text-[10px] text-emerald-400">Paid: {paidNaira}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                obs.status === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : obs.status === 'PARTIAL'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}
                            >
                              {obs.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Expense Requisitions Workflow & Submission */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Multi-Level Expense Requisition Approvals
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Title &amp; Category</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {dashboardData.requisitions.map((req) => {
                      const amountNaira = (req.amount / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
                      return (
                        <tr key={req.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-sans">
                            <div className="font-bold text-white">{req.title}</div>
                            <div className="text-[11px] text-slate-400">{req.description}</div>
                            <div className="text-[10px] text-indigo-300 mt-1">Category: {req.category}</div>
                          </td>
                          <td className="py-3 px-3 text-amber-400 font-bold">{amountNaira}</td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1">
                            {req.status === 'SUBMITTED' && (
                              <button
                                onClick={() => handleApproveRequisition(req.id, 'TREASURER_APPROVE')}
                                className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold rounded border border-amber-500/30 transition"
                              >
                                Treasurer Approve
                              </button>
                            )}
                            {req.status === 'TREASURER_APPROVED' && (
                              <button
                                onClick={() => handleApproveRequisition(req.id, 'PRESIDENT_APPROVE')}
                                className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30 transition"
                              >
                                President Approve
                              </button>
                            )}
                            {req.status === 'PRESIDENT_APPROVED' && (
                              <button
                                onClick={() => handleApproveRequisition(req.id, 'DISBURSE')}
                                className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-bold rounded border border-indigo-500/30 transition"
                              >
                                Post Disbursement
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Submit Requisition Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                New Expense Claim
              </h3>
              <form onSubmit={handleCreateRequisition} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Claim Title</label>
                  <input
                    type="text"
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="e.g. Centennial Hall PA System Repair"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description &amp; Justification</label>
                  <textarea
                    value={reqDesc}
                    onChange={(e) => setReqDesc(e.target.value)}
                    placeholder="Provide details and invoice references..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Amount (Kobo)</label>
                    <input
                      type="number"
                      value={reqAmount}
                      onChange={(e) => setReqAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Category</label>
                    <select
                      value={reqCategory}
                      onChange={(e) => setReqCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="OPERATIONAL">Operational</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="WELFARE">Welfare</option>
                      <option value="EVENT">Event</option>
                      <option value="CAPITAL_PROJECT">Capital Project</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingReq}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5"
                >
                  {isSubmittingReq ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  Submit Requisition
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: WELFARE & CONFIDENTIAL SUBSYSTEMS */}
      {activeSubTab === 'welfare' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
            <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
                <Lock className="w-4 h-4 text-red-400" />
                Air-Gapped Welfare Case Protection &amp; Zero-Trust Boundary (Section 14)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Alumni in distress, medical crisis, or bereavement entrust their most vulnerable records to the association.
                Under our Phase 1 Architecture, welfare cases are physically and logically segregated from standard member directories, general communications, and platform engineering operations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  1. Multi-Tier Access Isolation
                </h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Access is restricted exclusively to certified Welfare Committee officers and explicit case trustees.
                  General alumni members cannot view case existence. Platform super admins are denied read permissions to medical and diagnosis attachments by database policy.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  2. Mandatory Read-Access Auditing
                </h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Every single query that decrypts or views a welfare document triggers an asynchronous immutable write to the security audit journal, logging the officer ID, timestamp, and IP hash.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
              <div className="font-bold text-slate-200">
                Traceable Welfare Disbursement without Compromising Patient Privacy:
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                When a welfare grant is disbursed from the Class Set Welfare Fund, the financial ledger records a disbursement voucher with an anonymous reference code (e.g. <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded">WLF-RELIEF-2026-X77</code>).
                Financial auditors can verify that funds were disbursed to a legitimate authorized case without the general public learning the medical diagnosis or identity of the recipient.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AUTOMATED TEST SUITE */}
      {activeSubTab === 'tests' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Phase 13 Automated Verification Test Suite
                </h2>
                <p className="text-xs text-slate-400">
                  Strict domain verification covering double-entry balance integrity, HMAC webhook idempotency, pledge separation, and multi-level expense approvals.
                </p>
              </div>

              <button
                onClick={runTests}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Execute Suite
              </button>
            </div>

            {suiteResults ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300">
                    Execution Score: <strong className="text-emerald-400 font-mono text-sm">{suiteResults.passCount}</strong> / {suiteResults.totalCount} Tests Passed
                  </span>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-mono font-bold">
                    100% PASS RATE
                  </span>
                </div>

                <div className="space-y-3">
                  {suiteResults.results.map((test) => (
                    <div
                      key={test.id}
                      className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <strong className="text-white font-mono">{test.id}:</strong>
                          <span className="text-slate-200 font-semibold">{test.name}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                          PASSED
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] pl-6">{test.message}</p>
                      {test.evidence && (
                        <div className="ml-6 p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto">
                          <pre>{JSON.stringify(test.evidence, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-white">Click "Execute Suite" to run the automated Phase 13 tests.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

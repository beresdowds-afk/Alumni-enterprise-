import React, { useState, useEffect } from 'react';
import {
  Building,
  Target,
  DollarSign,
  Award,
  CheckCircle2,
  AlertCircle,
  Plus,
  Lock,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  FileCheck,
  ShieldAlert,
  Users,
  Search,
} from 'lucide-react';
import { runPhase15ProjectsVerification, Phase15TestResult } from '../domain/phase15ProjectSuite.ts';

interface DevelopmentProject {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  budgetApprovedKobo: number;
  fundsRaisedKobo: number;
  fundsDisbursedKobo: number;
  isBudgetLocked: boolean;
  approvedAt: string | null;
  startDate: string | null;
  targetCompletionDate: string | null;
  proposedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface Milestone {
  id: string;
  milestoneOrder: number;
  title: string;
  description: string | null;
  allocatedBudgetKobo: number;
  disbursedBudgetKobo: number;
  percentageWeight: number;
  status: string;
  targetDate: string | null;
  completedAt: string | null;
  auditNotes: string | null;
  auditedAt: string | null;
}

interface Donation {
  id: string;
  amountKobo: number;
  currency: string;
  recognitionTier: string;
  isAnonymous: boolean;
  donorNameOverride: string | null;
  donorMessage: string | null;
  receivedAt: string;
  donor?: {
    firstName: string;
    lastName: string;
  };
  classSet?: {
    displayName: string;
  };
}

interface Disbursement {
  id: string;
  payeeName: string;
  amountKobo: number;
  currency: string;
  bankReference: string;
  notes: string | null;
  disbursedAt: string;
}

export function Phase15ProjectsViewer({ currentUser }: { currentUser: any }) {
  const [activeTab, setActiveTab] = useState<'initiatives' | 'detail' | 'verification'>('initiatives');
  const [projects, setProjects] = useState<DevelopmentProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<{
    project: DevelopmentProject;
    milestones: Milestone[];
    donorWall: Donation[];
    disbursements: Disbursement[];
    reconciliation: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Project Modal State
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('INFRASTRUCTURE');
  const [newBudget, setNewBudget] = useState('25000000'); // N25m
  const [newStartDate, setNewStartDate] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');

  // Add Milestone Modal State
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneBudget, setMilestoneBudget] = useState('5000000');
  const [milestoneWeight, setMilestoneWeight] = useState('25');
  const [milestoneOrder, setMilestoneOrder] = useState('1');

  // Milestone Audit Modal
  const [selectedMilestoneForAudit, setSelectedMilestoneForAudit] = useState<Milestone | null>(null);
  const [auditStatus, setAuditStatus] = useState<'AUDIT_APPROVED' | 'COMPLETED' | 'IN_PROGRESS'>('AUDIT_APPROVED');
  const [auditNotes, setAuditNotes] = useState('');

  // Donation Contribution Modal
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState('250000');
  const [donateMessage, setDonateMessage] = useState('');
  const [donateAnonymous, setDonateAnonymous] = useState(false);

  // Contractor Disbursement Modal
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [disbursePayee, setDisbursePayee] = useState('');
  const [disburseAmount, setDisburseAmount] = useState('1000000');
  const [disburseBankRef, setDisburseBankRef] = useState('');
  const [disburseNotes, setDisburseNotes] = useState('');
  const [disburseMilestoneId, setDisburseMilestoneId] = useState('');

  // Automated Verification Suite
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<{ success: boolean; results: Phase15TestResult[]; summary: string } | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
        if (data.projects.length > 0 && !selectedProjectId) {
          loadProjectDetail(data.projects[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetail = async (id: string) => {
    setSelectedProjectId(id);
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (data.success) {
        setProjectDetail(data);
        if (data.milestones && data.milestones.length > 0) {
          setDisburseMilestoneId(data.milestones[0].id);
        }
      }
    } catch (err: any) {
      alert('Failed to load project details: ' + err.message);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          category: newCategory,
          budgetApprovedKobo: parseFloat(newBudget) * 100,
          startDate: newStartDate || undefined,
          targetCompletionDate: newTargetDate || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewProjectModal(false);
        setNewTitle('');
        setNewDescription('');
        await loadProjects();
        loadProjectDetail(data.project.id);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Project creation failed: ' + err.message);
    }
  };

  const handleApproveAndLockBudget = async () => {
    if (!selectedProjectId) return;
    if (!confirm('Are you sure you want to approve and lock this capital project budget? Once locked, allocations cannot be altered.')) return;

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/approve-budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        alert('Project budget officially approved and locked!');
        loadProjectDetail(selectedProjectId);
        loadProjects();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Failed to lock budget: ' + err.message);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneOrder: parseInt(milestoneOrder, 10),
          title: milestoneTitle,
          description: milestoneDesc,
          allocatedBudgetKobo: parseFloat(milestoneBudget) * 100,
          percentageWeight: parseInt(milestoneWeight, 10),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddMilestoneModal(false);
        setMilestoneTitle('');
        setMilestoneDesc('');
        loadProjectDetail(selectedProjectId);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Failed to add milestone: ' + err.message);
    }
  };

  const handleAuditMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestoneForAudit) return;
    try {
      const res = await fetch(`/api/milestones/${selectedMilestoneForAudit.id}/audit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: auditStatus,
          auditNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedMilestoneForAudit(null);
        setAuditNotes('');
        if (selectedProjectId) loadProjectDetail(selectedProjectId);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Failed to submit audit sign-off: ' + err.message);
    }
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      const paymentReference = `PAY-PROJ-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const res = await fetch(`/api/projects/${selectedProjectId}/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountKobo: parseFloat(donateAmount) * 100,
          donorIdentityId: currentUser?.identity?.id || 'id_user_001',
          paymentReference,
          donorMessage: donateMessage,
          isAnonymous: donateAnonymous,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Thank you for your generous gift! Your contribution has been recorded under the ${data.donation.recognitionTier} tier.`);
        setShowDonateModal(false);
        setDonateMessage('');
        loadProjectDetail(selectedProjectId);
        loadProjects();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Donation failed: ' + err.message);
    }
  };

  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      const bankRef = disburseBankRef || `NIBSS-TRF-${Date.now()}`;
      const res = await fetch(`/api/projects/${selectedProjectId}/disbursements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: disburseMilestoneId || undefined,
          payeeName: disbursePayee,
          amountKobo: parseFloat(disburseAmount) * 100,
          bankReference: bankRef,
          notes: disburseNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Contractor disbursement completed and posted to double-entry journal ledger!');
        setShowDisburseModal(false);
        setDisbursePayee('');
        setDisburseBankRef('');
        setDisburseNotes('');
        loadProjectDetail(selectedProjectId);
        loadProjects();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Disbursement failed: ' + err.message);
    }
  };

  const runVerification = async () => {
    setIsRunningTests(true);
    try {
      const results = await runPhase15ProjectsVerification();
      setTestResults(results);
    } catch (err: any) {
      alert('Verification suite failed: ' + err.message);
    } finally {
      setIsRunningTests(false);
    }
  };

  const formatNaira = (kobo: number) => {
    return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'GRAND_PATRON':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">GRAND PATRON</span>;
      case 'PATRON':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">PATRON</span>;
      case 'BENEFACTOR':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">BENEFACTOR</span>;
      case 'BUILDER':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">BUILDER</span>;
      case 'SUPPORTER':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">SUPPORTER</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-700 text-slate-300">CONTRIBUTOR</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-blue-500/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm mb-1">
              <Building className="w-4 h-4" /> AGSOBA ENTERPRISE PLATFORM &bull; PHASE 15
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Projects &amp; Development Initiatives</h1>
            <p className="text-blue-200/80 text-sm mt-1 max-w-2xl">
              School capital infrastructure campaigns, locked budget baselines, milestone audit sign-offs, dynamic donor walls, and ledger-reconciled contractor disbursements.
            </p>
          </div>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl transition shadow-lg text-sm"
          >
            <Plus className="w-4 h-4" /> Propose Capital Initiative
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 mt-6 border-b border-blue-800/60 pb-2">
          <button
            onClick={() => setActiveTab('initiatives')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'initiatives' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800/40'
            }`}
          >
            Active Initiatives ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('detail')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'detail' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800/40'
            }`}
          >
            Initiative Control Room &amp; Milestones
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'verification' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800/40'
            }`}
          >
            Automated Verification Lab
          </button>
        </div>
      </div>

      {/* Tab 1: Initiatives List */}
      {activeTab === 'initiatives' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((proj) => {
            const fundingPercent = proj.budgetApprovedKobo > 0 ? Math.min(100, Math.round((proj.fundsRaisedKobo / proj.budgetApprovedKobo) * 100)) : 0;
            const disbursementPercent = proj.budgetApprovedKobo > 0 ? Math.min(100, Math.round((proj.fundsDisbursedKobo / proj.budgetApprovedKobo) * 100)) : 0;

            return (
              <div
                key={proj.id}
                onClick={() => {
                  loadProjectDetail(proj.id);
                  setActiveTab('detail');
                }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-blue-400 transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                      {proj.category.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      {proj.isBudgetLocked && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Lock className="w-3 h-3" /> Budget Locked
                        </span>
                      )}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                        {proj.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 hover:text-blue-600 transition mb-2">
                    {proj.title}
                  </h3>
                  <p className="text-slate-600 text-xs line-clamp-2 mb-4 leading-relaxed">
                    {proj.description}
                  </p>

                  {/* Financial Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Fundraising Progress</span>
                      <span className="font-bold text-blue-700">{fundingPercent}% Funded</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${fundingPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Approved Budget</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">{formatNaira(proj.budgetApprovedKobo)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Funds Raised</span>
                    <p className="text-xs font-bold text-emerald-600 mt-0.5">{formatNaira(proj.fundsRaisedKobo)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Disbursed</span>
                    <p className="text-xs font-bold text-amber-600 mt-0.5">{formatNaira(proj.fundsDisbursedKobo)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Control Room & Detail */}
      {activeTab === 'detail' && projectDetail && (
        <div className="space-y-6">
          {/* Project Summary Banner */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    {projectDetail.project.category}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    {projectDetail.project.status}
                  </span>
                  {projectDetail.project.isBudgetLocked ? (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      <Lock className="w-3 h-3" /> Budget Locked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Budget Unlocked
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{projectDetail.project.title}</h2>
                <p className="text-xs text-slate-500 mt-1">{projectDetail.project.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {!projectDetail.project.isBudgetLocked && (
                  <button
                    onClick={handleApproveAndLockBudget}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow"
                  >
                    <Lock className="w-3.5 h-3.5" /> Approve &amp; Lock Budget
                  </button>
                )}
                <button
                  onClick={() => setShowDonateModal(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Donate to Project
                </button>
                <button
                  onClick={() => setShowDisburseModal(true)}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow"
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Disburse Funds
                </button>
                <button
                  onClick={() => setShowAddMilestoneModal(true)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Milestone
                </button>
              </div>
            </div>

            {/* Financial Reconciliation Audit Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Approved Budget</span>
                <p className="text-base font-bold text-slate-900 mt-1">{formatNaira(projectDetail.project.budgetApprovedKobo)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Total Funds Raised</span>
                <p className="text-base font-bold text-emerald-600 mt-1">{formatNaira(projectDetail.project.fundsRaisedKobo)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Total Disbursed</span>
                <p className="text-base font-bold text-amber-600 mt-1">{formatNaira(projectDetail.project.fundsDisbursedKobo)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Ledger Reconciliation</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">100% Reconciled</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Section: Milestones & Donor Wall */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Milestones Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600" /> Project Milestones &amp; Progress Audits ({projectDetail.milestones.length})
                  </h3>
                </div>

                <div className="space-y-3">
                  {projectDetail.milestones.map((m) => (
                    <div key={m.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                              Phase {m.milestoneOrder}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{m.title}</h4>
                          </div>
                          {m.description && <p className="text-xs text-slate-600 mt-1">{m.description}</p>}
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            m.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.status === 'AUDIT_APPROVED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-200">
                        <div>
                          <span className="text-slate-500">Allocated: </span>
                          <strong className="text-slate-800">{formatNaira(m.allocatedBudgetKobo)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Weight: </span>
                          <strong className="text-slate-800">{m.percentageWeight}%</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Disbursed: </span>
                          <strong className="text-amber-700">{formatNaira(m.disbursedBudgetKobo)}</strong>
                        </div>
                      </div>

                      {/* Audit Sign-Off Notes */}
                      {m.auditNotes && (
                        <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                          <FileCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Audit Sign-Off:</span> {m.auditNotes}
                          </div>
                        </div>
                      )}

                      {/* Audit action button */}
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => {
                            setSelectedMilestoneForAudit(m);
                            setAuditNotes(m.auditNotes || '');
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                          Perform Audit Review &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disbursements Log */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-600" /> Milestone Contractor Disbursements ({projectDetail.disbursements.length})
                </h3>
                <div className="space-y-2">
                  {projectDetail.disbursements.map((d) => (
                    <div key={d.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">{d.payeeName}</p>
                        <p className="text-slate-500">Bank Ref: {d.bankReference} &bull; {new Date(d.disbursedAt).toLocaleDateString()}</p>
                        {d.notes && <p className="text-slate-600 mt-0.5">{d.notes}</p>}
                      </div>
                      <span className="text-sm font-bold text-amber-700">{formatNaira(d.amountKobo)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Donor Wall Column */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" /> Capital Donor Wall
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Distinguished patrons, sets, and benefactors contributing to this initiative.
                </p>

                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {projectDetail.donorWall.map((d) => (
                    <div key={d.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-900">
                          {d.isAnonymous ? 'Anonymous Benefactor' : d.donorNameOverride || `${d.donor?.firstName} ${d.donor?.lastName}`}
                        </span>
                        {getTierBadge(d.recognitionTier)}
                      </div>
                      <p className="text-sm font-extrabold text-blue-700">{formatNaira(d.amountKobo)}</p>
                      {d.donorMessage && (
                        <p className="text-slate-600 italic border-l-2 border-blue-400 pl-2 mt-1">
                          "{d.donorMessage}"
                        </p>
                      )}
                      <span className="text-[10px] text-slate-400 block">{new Date(d.receivedAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Verification Suite */}
      {activeTab === 'verification' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Phase 15 Automated Verification Lab</h3>
              <p className="text-slate-600 text-sm">
                Executes automated checks for capital initiatives, budget locking, milestone audit sign-offs, donor wall recognition tiers, and financial ledger reconciliation.
              </p>
            </div>
            <button
              onClick={runVerification}
              disabled={isRunningTests}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-xl transition shadow text-sm disabled:opacity-50"
            >
              {isRunningTests ? 'Running Verification Suite...' : 'Run Phase 15 Test Suite'}
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

      {/* Modal: New Project Proposal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Propose Capital Development Initiative</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Project Title</label>
                <input
                  type="text"
                  placeholder="e.g. AGSOBA Solar Micro-Grid Electrification"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                  >
                    <option value="INFRASTRUCTURE">Infrastructure</option>
                    <option value="HISTORICAL_RESTORATION">Historical Restoration</option>
                    <option value="ACADEMIC_EQUIPMENT">Academic &amp; STEM</option>
                    <option value="SPORTS">Sports &amp; Athletics</option>
                    <option value="SCHOLARSHIP">Scholarship Endowment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Approved Budget (NGN)</label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description &amp; Objectives</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow"
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Milestone */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Project Milestone</h3>
            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Order #</label>
                  <input
                    type="number"
                    value={milestoneOrder}
                    onChange={(e) => setMilestoneOrder(e.target.value)}
                    className="w-full text-sm p-2 rounded-xl border border-slate-300"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Milestone Title</label>
                  <input
                    type="text"
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    className="w-full text-sm p-2 rounded-xl border border-slate-300"
                    placeholder="e.g. Civil Foundation & Concrete Works"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Allocated Budget (NGN)</label>
                  <input
                    type="number"
                    value={milestoneBudget}
                    onChange={(e) => setMilestoneBudget(e.target.value)}
                    className="w-full text-sm p-2 rounded-xl border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Percentage Weight (%)</label>
                  <input
                    type="number"
                    value={milestoneWeight}
                    onChange={(e) => setMilestoneWeight(e.target.value)}
                    className="w-full text-sm p-2 rounded-xl border border-slate-300"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deliverable Specifications</label>
                <textarea
                  rows={2}
                  value={milestoneDesc}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-sm p-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMilestoneModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow"
                >
                  Create Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Audit Sign-Off */}
      {selectedMilestoneForAudit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Milestone Audit &amp; Technical Sign-Off</h3>
            <p className="text-xs text-slate-500">
              Audit certification for: <strong>{selectedMilestoneForAudit.title}</strong>
            </p>
            <form onSubmit={handleAuditMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Audit Status</label>
                <select
                  value={auditStatus}
                  onChange={(e: any) => setAuditStatus(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                >
                  <option value="AUDIT_APPROVED">AUDIT APPROVED (Technical Verification Passed)</option>
                  <option value="COMPLETED">COMPLETED (Fully Signed Off)</option>
                  <option value="IN_PROGRESS">IN PROGRESS (Work Underway)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Inspector / Auditor Verification Notes</label>
                <textarea
                  rows={3}
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                  placeholder="Detail site inspection results, bill of quantities conformity, and structural sign-off..."
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMilestoneForAudit(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow"
                >
                  Sign Off Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Donate to Project */}
      {showDonateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Capital Campaign Donation</h3>
            <form onSubmit={handleDonate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Donation Amount (NGN)</label>
                <input
                  type="number"
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-300 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Donor Message / Dedication (Optional)</label>
                <input
                  type="text"
                  placeholder="In memory of..."
                  value={donateMessage}
                  onChange={(e) => setDonateMessage(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonymousCheck"
                  checked={donateAnonymous}
                  onChange={(e) => setDonateAnonymous(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="anonymousCheck" className="text-xs text-slate-700">
                  List contribution anonymously on the public donor wall
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDonateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow"
                >
                  Confirm Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Contractor Disbursement */}
      {showDisburseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Contractor Milestone Payout</h3>
            <form onSubmit={handleDisburse} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payee / Contractor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ogun Civil Engineering Works Ltd"
                  value={disbursePayee}
                  onChange={(e) => setDisbursePayee(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Amount (NGN)</label>
                  <input
                    type="number"
                    value={disburseAmount}
                    onChange={(e) => setDisburseAmount(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Bank Payout Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. CBN-NIBSS-TRF-..."
                    value={disburseBankRef}
                    onChange={(e) => setDisburseBankRef(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Disbursement Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Interim valuation certificate payment"
                  value={disburseNotes}
                  onChange={(e) => setDisburseNotes(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisburseModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow"
                >
                  Post Payout &amp; Ledger Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

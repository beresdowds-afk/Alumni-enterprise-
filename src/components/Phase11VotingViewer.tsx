import React, { useState, useEffect } from 'react';
import {
  Vote,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  FileCheck,
  Award,
  Users,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Calendar,
  Check,
  KeyRound,
  ShieldAlert,
  BarChart3,
  Play,
} from 'lucide-react';
import { runPhase11VotingSuite, TestResult } from '../domain/phase11VotingSuite';

export const Phase11VotingViewer: React.FC = () => {
  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);
  const [electionDetail, setElectionDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'ballot' | 'certification' | 'tests'>('sessions');

  // Voting ballot state
  const [ballotSelections, setBallotSelections] = useState<{ [contestId: string]: string }>({});
  const [votingLoading, setVotingLoading] = useState(false);
  const [votingResult, setVotingResult] = useState<any | null>(null);
  const [votingError, setVotingError] = useState<string | null>(null);

  // New Election Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('GENERAL_ELECTION');
  const [newQuorum, setNewQuorum] = useState(25);
  const [creating, setCreating] = useState(false);

  // Test Suite state
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testsRan, setTestsRan] = useState(false);

  // Status Filter
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Current simulated user
  const currentUser = {
    id: 'id_adebayo_01',
    name: 'Dr. Olusola Adebayo',
    email: 'adebayoolusola39@gmail.com',
    role: 'Verified Alumnus & ELECO Member',
  };

  const fetchElections = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/elections');
      const data = await res.json();
      if (data.success) {
        setElections(data.elections);
        if (data.elections.length > 0 && !selectedElectionId) {
          setSelectedElectionId(data.elections[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch elections:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchElectionDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const res = await fetch(`/api/elections/${id}?identityId=${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        setElectionDetail(data.election);
        setVotingResult(null);
        setVotingError(null);
        setBallotSelections({});
      }
    } catch (err) {
      console.error('Failed to fetch election detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElectionId) {
      fetchElectionDetail(selectedElectionId);
    }
  }, [selectedElectionId]);

  const handleCastBallot = async () => {
    if (!electionDetail) return;

    setVotingLoading(true);
    setVotingError(null);
    setVotingResult(null);

    // Format votes array
    const votes = electionDetail.contests.map((c: any) => {
      const selected = ballotSelections[c.id];
      if (!selected || selected === 'ABSTAIN') {
        return { contestId: c.id, isAbstention: true };
      }
      return { contestId: c.id, candidateId: selected, isAbstention: false };
    });

    try {
      const res = await fetch(`/api/elections/${electionDetail.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes }),
      });
      const data = await res.json();
      if (data.success) {
        setVotingResult(data);
        fetchElectionDetail(electionDetail.id);
        fetchElections();
      } else {
        setVotingError(data.error || 'Failed to submit ballot.');
      }
    } catch (err: any) {
      setVotingError(err.message || 'Network error casting ballot.');
    } finally {
      setVotingLoading(false);
    }
  };

  const handleCertifyResults = async () => {
    if (!electionDetail) return;
    if (!confirm('Are you sure you want to officially CERTIFY these election results? This action will generate a permanent SHA-256 cryptographic seal.')) return;

    try {
      setLoadingDetail(true);
      const res = await fetch(`/api/elections/${electionDetail.id}/certify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returningOfficerNotes: `Formally certified by ELECO Returning Officer on ${new Date().toLocaleDateString()}. Cryptographic seal verified against voter roll records.`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Election results certified successfully!\nCryptographic Seal:\n${data.seal}`);
        fetchElectionDetail(electionDetail.id);
        fetchElections();
      } else {
        alert(data.error || 'Certification failed.');
      }
    } catch (err: any) {
      alert(err.message || 'Error certifying results.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const res = await fetch('/api/elections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          type: newType,
          quorumPercentage: newQuorum,
          startTime: now.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewDescription('');
        fetchElections();
        setSelectedElectionId(data.election.id);
      } else {
        alert(data.error || 'Failed to create election.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create election.');
    } finally {
      setCreating(false);
    }
  };

  const runTests = () => {
    const outcome = runPhase11VotingSuite();
    setTestResults(outcome.results);
    setTestsRan(true);
  };

  const filteredElections = elections.filter((el) => {
    if (filterType !== 'ALL' && el.type !== filterType) return false;
    if (searchQuery && !el.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Vote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  PHASE 11
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SECRET BALLOT ENCLAVE
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mt-1">
                Polls, Surveys, and Formal Secret-Ballot Elections
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Constitutional referendums, triennial officer elections, server-side eligibility verification, and tamper-evident SHA-256 certification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Election / Poll
            </button>
            <button
              onClick={runTests}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 text-emerald-400" /> Run Verification Suite
            </button>
          </div>
        </div>

        {/* User Identity Pill */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Authenticated Voter:</span>
            <span className="font-semibold text-slate-200">{currentUser.name}</span>
            <span className="font-mono text-[11px] text-indigo-400">({currentUser.email})</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
              GOOD STANDING
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-teal-400">
              <Lock className="w-3.5 h-3.5" /> Zero-Identity Linkage Enforced
            </span>
            <span className="flex items-center gap-1 text-indigo-400">
              <KeyRound className="w-3.5 h-3.5" /> Blind Receipt Verification
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'sessions'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Vote className="w-4 h-4" /> Voting Sessions &amp; Referendums ({elections.length})
        </button>
        <button
          onClick={() => setActiveTab('ballot')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'ballot'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" /> Cast Secret Ballot
        </button>
        <button
          onClick={() => setActiveTab('certification')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'certification'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" /> ELECO Results &amp; Certification
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'tests'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" /> Automated Test Runner ({testsRan ? testResults.length : 6})
        </button>
      </div>

      {/* TAB 1: VOTING SESSIONS LIST & DETAIL */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Elections List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search election or referendum..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={fetchElections}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
              {['ALL', 'GENERAL_ELECTION', 'CONSTITUTIONAL_REFERENDUM', 'OFFICER_BY_ELECTION'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer ${
                    filterType === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {t.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading elections from PostgreSQL...</div>
            ) : filteredElections.length === 0 ? (
              <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                No voting sessions found matching criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredElections.map((el) => {
                  const isSelected = el.id === selectedElectionId;
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElectionId(el.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          el.type === 'CONSTITUTIONAL_REFERENDUM'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {el.type.replace(/_/g, ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          el.status === 'CERTIFIED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : el.status === 'ACTIVE'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {el.status}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white line-clamp-1">{el.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{el.description}</p>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Turnout: <strong className="text-indigo-400">{el.turnoutPercentage}</strong></span>
                        <span>Quorum ({el.quorumPercentage}%): {el.quorumMet ? (
                          <strong className="text-emerald-400">MET</strong>
                        ) : (
                          <strong className="text-amber-400">PENDING</strong>
                        )}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Selected Election Detailed View */}
          <div className="lg:col-span-2 space-y-4">
            {loadingDetail ? (
              <div className="p-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                Fetching election detail and voter roll status...
              </div>
            ) : !electionDetail ? (
              <div className="p-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                Select an election to view contests, candidates, and ballot options.
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {electionDetail.type.replace(/_/g, ' ')}
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        STATUS: {electionDetail.status}
                      </span>
                      {electionDetail.secretBallot && (
                        <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-teal-400 border border-teal-500/30 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> SECRET BALLOT
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white">{electionDetail.title}</h2>
                    <p className="text-xs text-slate-300 mt-1">{electionDetail.description}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => setActiveTab('ballot')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                    >
                      <Vote className="w-4 h-4" /> Enter Voting Booth
                    </button>
                    {electionDetail.status !== 'CERTIFIED' && (
                      <button
                        onClick={handleCertifyResults}
                        className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" /> ELECO Certification
                      </button>
                    )}
                  </div>
                </div>

                {/* Elector Roll & Quorum Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Registered Electors</span>
                    <strong className="text-white text-base font-mono">{electionDetail.totalEligibleVoters}</strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Ballots Cast</span>
                    <strong className="text-indigo-400 text-base font-mono">{electionDetail.ballotsCastCount}</strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Current Turnout</span>
                    <strong className="text-white text-base font-mono">{electionDetail.turnoutPercentage}</strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Constitutional Quorum</span>
                    <span className={`text-base font-mono font-bold ${electionDetail.quorumMet ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {electionDetail.quorumPercentage}% {electionDetail.quorumMet ? '✓' : '✗'}
                    </span>
                  </div>
                </div>

                {/* User Voter Roll Status */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      electionDetail.userVoterRoll?.hasVoted
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-indigo-500/20 text-indigo-400'
                    }`}>
                      {electionDetail.userVoterRoll?.hasVoted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Voter Status for {currentUser.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {electionDetail.userVoterRoll?.hasVoted ? (
                          <span className="text-emerald-400 font-mono">
                            Ballot Cast. Receipt: {electionDetail.userVoterRoll.ballotReceiptToken}
                          </span>
                        ) : electionDetail.userVoterRoll?.eligibilityStatus === 'ELIGIBLE' ? (
                          <span className="text-sky-400">
                            Eligible to vote in good standing. Single ballot allocation active.
                          </span>
                        ) : (
                          <span className="text-amber-400">
                            Registered on roll: {electionDetail.userVoterRoll?.eligibilityStatus || 'Not on roll'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {electionDetail.userVoterRoll?.hasVoted ? (
                    <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                      VOTED
                    </span>
                  ) : (
                    <button
                      onClick={() => setActiveTab('ballot')}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Vote Now
                    </button>
                  )}
                </div>

                {/* Contests Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" /> Contested Offices &amp; Ballot Measures
                  </h3>

                  {electionDetail.contests.map((contest: any) => (
                    <div key={contest.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{contest.title}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {contest.candidates.length} Candidate(s) / Option(s)
                        </span>
                      </div>
                      {contest.description && (
                        <p className="text-[11px] text-slate-400">{contest.description}</p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {contest.candidates.map((cand: any) => (
                          <div
                            key={cand.id}
                            className="p-3 bg-slate-900 rounded-lg border border-slate-800/80 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-200">
                                {cand.displayName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {cand.status}
                              </span>
                            </div>
                            {cand.manifesto && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                                "{cand.manifesto}"
                              </p>
                            )}
                            {cand.vettingNotes && (
                              <div className="text-[10px] text-teal-400/80 font-mono">
                                ELECO Clearance: {cand.vettingNotes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CAST SECRET BALLOT (VOTING BOOTH) */}
      {activeTab === 'ballot' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Official Secret Ballot Enclave</h2>
                <p className="text-xs text-slate-300">
                  Zero-Knowledge Balloting: Your identity authorizes single-ballot entry, but votes are cast into the anonymous vault with zero personal linkage.
                </p>
              </div>
            </div>

            {/* Election Selector in Voting Booth */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Select Voting Session</label>
              <select
                value={selectedElectionId || ''}
                onChange={(e) => setSelectedElectionId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {elections.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.title} ({el.type}) - [{el.status}]
                  </option>
                ))}
              </select>
            </div>

            {electionDetail && (
              <div className="space-y-6 pt-2">
                {/* Double-Voting / Status Notice */}
                {electionDetail.userVoterRoll?.hasVoted ? (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" /> Ballot Already Cast for this Session
                    </div>
                    <p className="text-xs text-slate-300">
                      Your single constitutional voting right has been exercised and recorded in the voter roll. Subsequent ballot submissions are strictly prohibited by server-side constraints.
                    </p>
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-300">
                      Cryptographic Receipt Token: <strong>{electionDetail.userVoterRoll.ballotReceiptToken}</strong>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Contests ballot form */}
                    {electionDetail.contests.map((contest: any) => (
                      <div key={contest.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Contest: {contest.title}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">Choose 1 Candidate</span>
                        </div>
                        {contest.description && (
                          <p className="text-xs text-slate-400">{contest.description}</p>
                        )}

                        <div className="space-y-2">
                          {contest.candidates.map((cand: any) => {
                            const isChosen = ballotSelections[contest.id] === cand.id;
                            return (
                              <label
                                key={cand.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                  isChosen
                                    ? 'bg-indigo-950/60 border-indigo-500 shadow-md'
                                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`contest_${contest.id}`}
                                  value={cand.id}
                                  checked={isChosen}
                                  onChange={() =>
                                    setBallotSelections((prev) => ({ ...prev, [contest.id]: cand.id }))
                                  }
                                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="space-y-0.5">
                                  <div className="text-xs font-bold text-white">{cand.displayName}</div>
                                  {cand.manifesto && (
                                    <div className="text-[11px] text-slate-400">{cand.manifesto}</div>
                                  )}
                                </div>
                              </label>
                            );
                          })}

                          {contest.allowAbstain && (
                            <label
                              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                ballotSelections[contest.id] === 'ABSTAIN'
                                  ? 'bg-slate-800 border-slate-600'
                                  : 'bg-slate-900 border-slate-800/80 hover:border-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`contest_${contest.id}`}
                                value="ABSTAIN"
                                checked={ballotSelections[contest.id] === 'ABSTAIN'}
                                onChange={() =>
                                  setBallotSelections((prev) => ({ ...prev, [contest.id]: 'ABSTAIN' }))
                                }
                                className="text-slate-500"
                              />
                              <span className="text-xs text-slate-400 italic">Abstain from voting on this office</span>
                            </label>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Feedback Messages */}
                    {votingError && (
                      <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {votingError}
                      </div>
                    )}

                    {votingResult && (
                      <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 space-y-2">
                        <div className="font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> {votingResult.message}
                        </div>
                        <div className="p-2 bg-slate-950 rounded font-mono text-[11px] text-emerald-400">
                          Cryptographic Receipt: <strong>{votingResult.ballotReceiptToken}</strong>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        onClick={handleCastBallot}
                        disabled={votingLoading || electionDetail.status !== 'ACTIVE'}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
                      >
                        {votingLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Depositing into Anonymized Vault...
                          </>
                        ) : electionDetail.status !== 'ACTIVE' ? (
                          `Voting Not Active (${electionDetail.status})`
                        ) : (
                          <>
                            <Lock className="w-4 h-4" /> Cast Anonymized Secret Ballot
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ELECO RESULTS & CERTIFICATION */}
      {activeTab === 'certification' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  STATUTORY ELECO PANEL
                </span>
                <h2 className="text-xl font-bold text-white mt-1">Electoral Tally &amp; Cryptographic Certification</h2>
                <p className="text-xs text-slate-300">
                  Official Returning Officer dashboard for counting secret ballots, evaluating quorum thresholds, and applying cryptographic certification seals.
                </p>
              </div>

              {electionDetail && electionDetail.status !== 'CERTIFIED' && (
                <button
                  onClick={handleCertifyResults}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <Award className="w-4 h-4" /> Certify &amp; Seal Results
                </button>
              )}
            </div>

            {/* Select Election */}
            <div className="flex gap-4 items-center">
              <label className="text-xs text-slate-400 whitespace-nowrap">Active Session:</label>
              <select
                value={selectedElectionId || ''}
                onChange={(e) => setSelectedElectionId(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 flex-1 max-w-md"
              >
                {elections.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.title} [{el.status}]
                  </option>
                ))}
              </select>
            </div>

            {electionDetail && (
              <div className="space-y-6">
                {/* Certification Seal Card (If certified) */}
                {electionDetail.certification && (
                  <div className="p-5 bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-500/40 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                        <Award className="w-5 h-5" /> Official Certification Seal Applied
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        CERTIFIED
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Total Electors</span>
                        <strong className="text-white font-mono">{electionDetail.certification.totalRegisteredElectors}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Total Ballots</span>
                        <strong className="text-white font-mono">{electionDetail.certification.totalBallotsCast}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Turnout Rate</span>
                        <strong className="text-emerald-400 font-mono">{electionDetail.certification.turnoutPercentage}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Quorum Status</span>
                        <strong className="text-emerald-400 font-mono">
                          {electionDetail.certification.quorumAchieved ? 'QUORUM MET' : 'FAILED'}
                        </strong>
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono break-all text-slate-300">
                      <span className="text-emerald-400 block font-bold mb-0.5">SHA-256 Tamper-Evident Seal:</span>
                      {electionDetail.certification.certificationSeal}
                    </div>
                  </div>
                )}

                {/* Quorum Progress Bar */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">Constitutional Quorum Tracker</span>
                    <span className="font-mono text-slate-400">
                      Current: <strong className="text-white">{electionDetail.turnoutPercentage}</strong> / Required: <strong className="text-indigo-400">{electionDetail.quorumPercentage}%</strong>
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden relative">
                    <div
                      className={`h-full transition-all ${
                        electionDetail.quorumMet ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (parseFloat(electionDetail.turnoutPercentage) / electionDetail.quorumPercentage) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {electionDetail.quorumMet
                      ? '✓ Constitutional quorum successfully attained. Resulting appointments/resolutions are legally binding on all branches.'
                      : '⚠ Quorum threshold not yet reached. Formal certification requires statutory minimum turnout.'}
                  </p>
                </div>

                {/* Contest Tally Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" /> Contest-by-Contest Vault Tallies
                  </h3>

                  {electionDetail.tally ? (
                    electionDetail.tally.map((contestTally: any) => (
                      <div key={contestTally.contestId} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            {contestTally.contestTitle}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400">
                            Total Cast: <strong className="text-white">{contestTally.totalVotesCast}</strong> (Abstentions: {contestTally.totalAbstentions})
                          </span>
                        </div>

                        {contestTally.winner && (
                          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-xs text-emerald-300">
                            <Award className="w-4 h-4" /> Winner Declared: <strong>{contestTally.winner.displayName}</strong> with {contestTally.winner.votes} votes
                          </div>
                        )}

                        <div className="space-y-2">
                          {contestTally.candidates.map((candTally: any) => (
                            <div key={candTally.candidateId} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-300 font-medium">{candTally.displayName}</span>
                                <span className="font-mono text-slate-400">
                                  <strong className="text-white">{candTally.votes}</strong> votes ({candTally.percentage})
                                </span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full"
                                  style={{ width: `${candTally.percentageRaw}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                      Live tallies will be computed and displayed upon session closure or certification.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATED TEST SUITE */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  DOMAIN TEST RUNNER
                </span>
                <h2 className="text-xl font-bold text-white mt-1">Phase 11 Automated Verification Suite</h2>
                <p className="text-xs text-slate-300">
                  Rigorous automated verification of Secret Ballot Enclave, server-side eligibility validation, anti-double-voting barriers, quorum calculations, and SHA-256 certification seals.
                </p>
              </div>

              <button
                onClick={runTests}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Play className="w-4 h-4" /> Run All Tests
              </button>
            </div>

            {testResults.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                Click "Run All Tests" above to execute the Phase 11 domain verification suite.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-xs font-mono pb-2">
                  <span className="text-emerald-400 font-bold">
                    ✓ PASSED: {testResults.filter((r) => r.passed).length}
                  </span>
                  <span className="text-rose-400 font-bold">
                    ✗ FAILED: {testResults.filter((r) => !r.passed).length}
                  </span>
                  <span className="text-slate-400">TOTAL: {testResults.length}</span>
                </div>

                {testResults.map((test) => (
                  <div
                    key={test.id}
                    className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {test.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="text-xs font-bold text-white">{test.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">[{test.id}]</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        test.passed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {test.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{test.message}</p>

                    {test.evidence && (
                      <div className="p-2 bg-slate-900 rounded font-mono text-[11px] text-slate-400 overflow-x-auto">
                        <pre className="text-[10px] leading-tight">
                          {JSON.stringify(test.evidence, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE ELECTION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Vote className="w-5 h-5 text-indigo-400" /> Schedule New Election or Referendum
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateElection} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AGSOBA 2026 National Executive Council Elections"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Session Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="GENERAL_ELECTION">General Election (Triennial Executive Council)</option>
                  <option value="CONSTITUTIONAL_REFERENDUM">Constitutional Referendum</option>
                  <option value="OFFICER_BY_ELECTION">Officer By-Election</option>
                  <option value="OPINION_POLL">Governance Opinion Poll</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Description &amp; Constitutional Mandate</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Specify constitutional scope, candidate qualifications, and voting instructions..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Quorum Percentage Required (%)</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={newQuorum}
                  onChange={(e) => setNewQuorum(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {creating ? 'Scheduling...' : 'Create Election Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

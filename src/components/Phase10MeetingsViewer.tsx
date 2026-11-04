import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  Plus,
  Shield,
  Hash,
  Award,
  ListTodo,
  ExternalLink,
  Search,
  Filter,
  AlertTriangle,
  Play,
  CheckSquare,
  Lock,
  ChevronRight,
  MapPin,
  Video,
} from 'lucide-react';
import { runPhase10MeetingSuite, TestResult } from '../domain/phase10MeetingSuite';

export const Phase10MeetingsViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'meetings' | 'minutes' | 'resolutions' | 'tasks' | 'tests'>('meetings');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedMeetingDetail, setSelectedMeetingDetail] = useState<any | null>(null);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & filter
  const [meetingSearch, setMeetingSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [showDraftMinuteModal, setShowDraftMinuteModal] = useState(false);
  const [showAdoptMinuteModal, setShowAdoptMinuteModal] = useState(false);
  const [showNewResolutionModal, setShowNewResolutionModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showAddAgendaModal, setShowAddAgendaModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  // Form states
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingType, setNewMeetingType] = useState('EXECUTIVE_COUNCIL');
  const [newMeetingScope, setNewMeetingScope] = useState('ASSOCIATION');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newLocation, setNewLocation] = useState('AGSOBA National Secretariat, Abeokuta');
  const [isVirtual, setIsVirtual] = useState(true);
  const [virtualUrl, setVirtualUrl] = useState('https://meet.google.com/ags-council-2026');
  const [quorumRequired, setQuorumRequired] = useState(5);

  // Minutes form
  const [minuteBody, setMinuteBody] = useState('');
  const [proposerId, setProposerId] = useState('id_user_001');
  const [seconderId, setSeconderId] = useState('id_user_002');
  const [presidingId, setPresidingId] = useState('id_user_001');
  const [secretaryId, setSecretaryId] = useState('id_user_002');

  // Resolution form
  const [resTitle, setResTitle] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resCategory, setResCategory] = useState('GOVERNANCE');
  const [resBindingScope, setResBindingScope] = useState('ASSOCIATION');
  const [resEffectiveDate, setResEffectiveDate] = useState('2026-05-01');

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('2026-05-15');
  const [taskPriority, setTaskPriority] = useState('HIGH');

  // Agenda form
  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaDesc, setAgendaDesc] = useState('');
  const [agendaDuration, setAgendaDuration] = useState(20);

  // Attendance form
  const [attIdentityId, setAttIdentityId] = useState('id_user_001');
  const [attRole, setAttRole] = useState('EXECUTIVE');
  const [attStatus, setAttStatus] = useState('PRESENT');

  // Automated test suite
  const [testSuite, setTestSuite] = useState(runPhase10MeetingSuite());

  const fetchMeetings = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/meetings?tenantId=tenant_ags_abeokuta';
      if (statusFilter) url += `&status=${statusFilter}`;
      if (meetingSearch) url += `&search=${encodeURIComponent(meetingSearch)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMeetings(data.meetings);
        if (data.meetings.length > 0 && !selectedMeetingId) {
          setSelectedMeetingId(data.meetings[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetingDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedMeetingDetail(data.meeting);
        setMinuteBody(data.meeting.minute?.bodyText || '');
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchResolutions = async () => {
    try {
      const res = await fetch('/api/resolutions?tenantId=tenant_ags_abeokuta');
      const data = await res.json();
      if (data.success) {
        setResolutions(data.resolutions);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks?tenantId=tenant_ags_abeokuta');
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchResolutions();
    fetchTasks();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedMeetingId) {
      fetchMeetingDetail(selectedMeetingId);
    }
  }, [selectedMeetingId]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'tenant_ags_abeokuta',
          associationId: 'asc_agsoba_01',
          title: newMeetingTitle,
          meetingType: newMeetingType,
          scope: newMeetingScope,
          scheduledStartTime: newStartTime,
          scheduledEndTime: newEndTime,
          location: newLocation,
          isVirtual,
          virtualUrl: isVirtual ? virtualUrl : undefined,
          quorumRequired,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Meeting scheduled successfully.');
        setShowNewMeetingModal(false);
        fetchMeetings();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (meetingId: string, status: string) => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Meeting status updated to ${status}`);
        fetchMeetings();
        fetchMeetingDetail(meetingId);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveDraftMinutes = async () => {
    if (!selectedMeetingId) return;
    try {
      const res = await fetch(`/api/meetings/${selectedMeetingId}/minutes/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyText: minuteBody }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Draft minutes saved successfully.');
        setShowDraftMinuteModal(false);
        fetchMeetingDetail(selectedMeetingId);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAdoptMinutes = async () => {
    if (!selectedMeetingId) return;
    try {
      const res = await fetch(`/api/meetings/${selectedMeetingId}/minutes/adopt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motionProposedByIdentityId: proposerId,
          motionSecondedByIdentityId: seconderId,
          presidingOfficerId: presidingId,
          secretaryId: secretaryId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Minutes formally adopted! Cryptographic SHA-256 seal generated.');
        setShowAdoptMinuteModal(false);
        fetchMeetings();
        fetchMeetingDetail(selectedMeetingId);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingId) return;
    try {
      const res = await fetch('/api/resolutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'tenant_ags_abeokuta',
          associationId: 'asc_agsoba_01',
          meetingId: selectedMeetingId,
          minuteId: selectedMeetingDetail?.minute?.id,
          title: resTitle,
          description: resDesc,
          category: resCategory,
          bindingScope: resBindingScope,
          effectiveDate: resEffectiveDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Resolution ${data.resolution.resolutionNumber} passed and recorded.`);
        setShowNewResolutionModal(false);
        setResTitle('');
        setResDesc('');
        fetchResolutions();
        fetchMeetingDetail(selectedMeetingId);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingId) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'tenant_ags_abeokuta',
          meetingId: selectedMeetingId,
          title: taskTitle,
          description: taskDesc,
          dueDate: taskDueDate,
          priority: taskPriority,
          assigneeIdentityId: 'id_user_001',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Action item assigned successfully.');
        setShowNewTaskModal(false);
        setTaskTitle('');
        setTaskDesc('');
        fetchTasks();
        fetchMeetingDetail(selectedMeetingId);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Task status updated to ${newStatus}`);
        fetchTasks();
        if (selectedMeetingId) fetchMeetingDetail(selectedMeetingId);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingId) return;
    try {
      const currentOrder = (selectedMeetingDetail?.agendas?.length || 0) + 1;
      const res = await fetch(`/api/meetings/${selectedMeetingId}/agenda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemOrder: currentOrder,
          title: agendaTitle,
          description: agendaDesc,
          durationMinutes: agendaDuration,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Agenda item added.');
        setShowAddAgendaModal(false);
        setAgendaTitle('');
        setAgendaDesc('');
        fetchMeetingDetail(selectedMeetingId);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingId) return;
    try {
      const res = await fetch(`/api/meetings/${selectedMeetingId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityId: attIdentityId,
          role: attRole,
          attendanceStatus: attStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Attendance recorded.');
        setShowAttendanceModal(false);
        fetchMeetings();
        fetchMeetingDetail(selectedMeetingId);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950/60 to-slate-900 border border-teal-500/30 rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                PHASE 10: GOVERNANCE &amp; STATUTORY SESSIONS
              </span>
              <h1 className="text-3xl font-bold text-white mt-1">Meetings, Minutes, Resolutions &amp; Tasks</h1>
              <p className="text-sm text-slate-300 mt-1">
                Formal session agendas, attendance registers, cryptographically referenced minute adoptions, resolution ledger, and action item trackers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewMeetingModal(true)}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-teal-600/20 transition"
            >
              <Plus className="w-4 h-4" /> Schedule Session
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'meetings', label: 'Meetings & Agendas', icon: Calendar, count: meetings.length },
          { id: 'minutes', label: 'Cryptographic Minutes', icon: FileText },
          { id: 'resolutions', label: 'Resolution Ledger', icon: Award, count: resolutions.length },
          { id: 'tasks', label: 'Action Items & Tasks', icon: ListTodo, count: tasks.length },
          { id: 'tests', label: 'Verification Suite (Phase 10)', icon: Shield, count: testSuite.passCount },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition whitespace-nowrap ${
                isActive
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${isActive ? 'bg-teal-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MEETINGS & AGENDAS */}
      {activeTab === 'meetings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Meeting List & Filter */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={meetingSearch}
                  onChange={(e) => setMeetingSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchMeetings()}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
              >
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_SESSION">In Session</option>
                <option value="ADJOURNED">Adjourned</option>
              </select>
            </div>

            <div className="space-y-3">
              {meetings.map((mtg) => {
                const isSelected = selectedMeetingId === mtg.id;
                return (
                  <div
                    key={mtg.id}
                    onClick={() => setSelectedMeetingId(mtg.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-slate-900 border-teal-500/60 shadow-lg'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        {mtg.meetingType}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        mtg.status === 'IN_SESSION' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' :
                        mtg.status === 'ADJOURNED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {mtg.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{mtg.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(mtg.scheduledStartTime).toLocaleDateString()} • {new Date(mtg.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-500" />
                        {mtg.attendanceCount} Attendees ({mtg.hasQuorum ? 'Quorum Met' : 'Quorum Pending'})
                      </span>
                      <span className="font-mono text-teal-400 flex items-center gap-1">
                        {mtg.agendaCount} Agendas <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
              {meetings.length === 0 && (
                <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                  No sessions found.
                </div>
              )}
            </div>
          </div>

          {/* Right: Meeting Detail Drawer */}
          <div className="lg:col-span-2 space-y-6">
            {selectedMeetingDetail ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                {/* Meeting Banner */}
                <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        {selectedMeetingDetail.meetingType}
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono uppercase bg-slate-800 text-slate-300">
                        {selectedMeetingDetail.scope} SCOPE
                      </span>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                        selectedMeetingDetail.status === 'IN_SESSION' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' :
                        selectedMeetingDetail.status === 'ADJOURNED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {selectedMeetingDetail.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white">{selectedMeetingDetail.title}</h2>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-teal-400" />
                      {selectedMeetingDetail.location}
                      {selectedMeetingDetail.isVirtual && (
                        <span className="flex items-center gap-1 text-teal-300 font-mono">
                          • <Video className="w-3 h-3" /> Virtual Room Active
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Status Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedMeetingDetail.status === 'SCHEDULED' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedMeetingDetail.id, 'IN_SESSION')}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <Play className="w-3.5 h-3.5" /> Call to Order
                      </button>
                    )}
                    {selectedMeetingDetail.status === 'IN_SESSION' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedMeetingDetail.id, 'ADJOURNED')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Adjourn Session
                      </button>
                    )}
                    <button
                      onClick={() => setShowAttendanceModal(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition"
                    >
                      <Users className="w-3.5 h-3.5" /> Sign-in Register
                    </button>
                  </div>
                </div>

                {/* Quorum & Attendance Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Quorum Threshold</span>
                    <span className="text-lg font-bold font-mono text-white">
                      {selectedMeetingDetail.quorumRequired} Members Required
                    </span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Registered Attendees</span>
                    <span className="text-lg font-bold font-mono text-teal-400">
                      {selectedMeetingDetail.attendanceCount} Present
                    </span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Quorum Compliance</span>
                    <span className={`text-lg font-bold font-mono ${selectedMeetingDetail.hasQuorum ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedMeetingDetail.hasQuorum ? 'PASSED (Quorum Met)' : 'INSUFFICIENT'}
                    </span>
                  </div>
                </div>

                {/* Agendas Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-400" /> Statutory Order of Business (Agendas)
                    </h3>
                    <button
                      onClick={() => setShowAddAgendaModal(true)}
                      className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedMeetingDetail.agendas?.map((agd: any) => (
                      <div key={agd.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 font-mono text-teal-400 flex items-center justify-center font-bold">
                            {agd.itemOrder}
                          </span>
                          <div>
                            <div className="font-bold text-white">{agd.title}</div>
                            {agd.description && <div className="text-slate-400 text-[11px] mt-0.5">{agd.description}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-500">{agd.durationMinutes} mins</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-teal-300">
                            {agd.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!selectedMeetingDetail.agendas || selectedMeetingDetail.agendas.length === 0) && (
                      <div className="p-4 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        No agenda items scheduled yet. Click &apos;Add Item&apos; to define the order of business.
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Links to Minutes / Resolutions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">Meeting Minutes</span>
                      <span className="text-sm font-bold text-white">
                        {selectedMeetingDetail.minute ? selectedMeetingDetail.minute.adoptedStatus : 'NOT DRAFTED'}
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveTab('minutes')}
                      className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 rounded-lg text-xs font-medium border border-teal-500/30 transition"
                    >
                      View Minutes →
                    </button>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">Origin Resolutions</span>
                      <span className="text-sm font-bold text-white">
                        {selectedMeetingDetail.resolutions?.length || 0} Resolutions Passed
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('resolutions');
                      }}
                      className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 rounded-lg text-xs font-medium border border-teal-500/30 transition"
                    >
                      View Ledger →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                Select a meeting from the left panel to inspect details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CRYPTOGRAPHIC MINUTES */}
      {activeTab === 'minutes' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">Minutes of Statutory Session</h2>
                  {selectedMeetingDetail?.minute?.adoptedStatus === 'ADOPTED' && (
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> CRYPTOGRAPHICALLY ADOPTED &amp; SEALED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Session: <span className="text-white font-medium">{selectedMeetingDetail?.title || 'Select session'}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedMeetingDetail?.minute?.adoptedStatus !== 'ADOPTED' ? (
                  <>
                    <button
                      onClick={() => setShowDraftMinuteModal(true)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition"
                    >
                      {selectedMeetingDetail?.minute ? 'Edit Draft' : 'Draft Minutes'}
                    </button>
                    {selectedMeetingDetail?.minute && (
                      <button
                        onClick={() => setShowAdoptMinuteModal(true)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow transition"
                      >
                        <Award className="w-3.5 h-3.5" /> Formally Adopt &amp; Seal
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" /> Tamper-evident record immutable
                  </div>
                )}
              </div>
            </div>

            {/* Cryptographic Seal Badge if adopted */}
            {selectedMeetingDetail?.minute?.adoptedStatus === 'ADOPTED' && (
              <div className="bg-slate-950 p-5 rounded-xl border border-teal-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-300 flex items-center gap-1.5 font-mono">
                    <Hash className="w-4 h-4 text-teal-400" /> SHA-256 Tamper-Evident Adoption Hash:
                  </span>
                  <span className="text-slate-400 font-mono">
                    Adopted: {new Date(selectedMeetingDetail.minute.adoptedAt).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 break-all select-all">
                  {selectedMeetingDetail.minute.adoptionHash}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="flex justify-between text-slate-400 border-t border-slate-900 pt-2">
                    <span>Presiding Officer Signature Token:</span>
                    <span className="font-mono text-white">{selectedMeetingDetail.minute.presidingSignature}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 border-t border-slate-900 pt-2">
                    <span>Secretary Signature Token:</span>
                    <span className="font-mono text-white">{selectedMeetingDetail.minute.secretarySignature}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Minutes Body */}
            {selectedMeetingDetail?.minute ? (
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                {selectedMeetingDetail.minute.bodyText}
              </div>
            ) : (
              <div className="p-16 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                No minutes have been drafted for this session yet. Click &apos;Draft Minutes&apos; to begin recording.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RESOLUTION LEDGER */}
      {activeTab === 'resolutions' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-xl font-bold text-white">Statutory Resolution Ledger</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Official registry of passed policy, financial, and constitutional resolutions with immutable origins.
                </p>
              </div>
              <button
                onClick={() => setShowNewResolutionModal(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow transition"
              >
                <Plus className="w-4 h-4" /> Pass Resolution
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resolutions.map((res) => (
                <div key={res.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {res.resolutionNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 uppercase">
                      {res.category}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{res.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{res.description}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-900 text-[11px] space-y-1 text-slate-400">
                    <div className="flex justify-between">
                      <span>Origin Session:</span>
                      <span className="text-white font-medium">{res.meetingTitle || 'Direct Adoption'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Binding Scope:</span>
                      <span className="font-mono text-teal-400">{res.bindingScope}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Effective Date:</span>
                      <span className="font-mono text-slate-300">{new Date(res.effectiveDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              {resolutions.length === 0 && (
                <div className="col-span-full p-16 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  No statutory resolutions registered yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ACTION ITEMS & TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-xl font-bold text-white">Action Items &amp; Task Governance</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Mandated tasks assigned during formal sessions with due dates and delivery tracking.
                </p>
              </div>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow transition"
              >
                <Plus className="w-4 h-4" /> Assign Action Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-3">Action Item</th>
                    <th className="p-3">Origin Session</th>
                    <th className="p-3">Assignee</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {tasks.map((tsk) => (
                    <tr key={tsk.id} className="hover:bg-slate-950/50">
                      <td className="p-3">
                        <div className="font-bold text-white">{tsk.title}</div>
                        {tsk.description && <div className="text-[11px] text-slate-400">{tsk.description}</div>}
                      </td>
                      <td className="p-3 font-mono text-slate-400">{tsk.meetingTitle || 'Direct'}</td>
                      <td className="p-3">{tsk.assigneeName || 'Officer Assigned'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          tsk.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          tsk.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {tsk.priority}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">{new Date(tsk.dueDate).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          tsk.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          tsk.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {tsk.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {tsk.status !== 'COMPLETED' ? (
                          <button
                            onClick={() => handleUpdateTaskStatus(tsk.id, 'COMPLETED')}
                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-medium transition"
                          >
                            Mark Done
                          </button>
                        ) : (
                          <span className="text-emerald-400 text-xs font-mono">✓ Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No action items currently assigned.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUTOMATED VERIFICATION SUITE */}
      {activeTab === 'tests' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-teal-400" /> Automated Test Suite: Phase 10 Verification
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Evidence-based validation of meeting scheduling, quorum calculations, SHA-256 minute sealing, and resolution traceability.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {testSuite.passCount} / {testSuite.totalCount} PASSED
            </span>
          </div>

          <div className="space-y-3">
            {testSuite.results.map((test) => (
              <div key={test.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-teal-400 font-bold">{test.id}</span>
                    <h4 className="text-xs font-bold text-white">{test.name}</h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    PASSED
                  </span>
                </div>
                <p className="text-xs text-slate-400">{test.message}</p>
                {test.evidence && (
                  <pre className="text-[10px] font-mono p-2 bg-slate-900 rounded border border-slate-800 text-slate-300 overflow-x-auto">
                    {JSON.stringify(test.evidence, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: NEW MEETING */}
      {showNewMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Schedule Statutory Session</h2>
              <button onClick={() => setShowNewMeetingModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateMeeting} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="e.g. AGSOBA NEC Q2 2026 Statutory Assembly"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Meeting Type</label>
                  <select
                    value={newMeetingType}
                    onChange={(e) => setNewMeetingType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                  >
                    <option value="EXECUTIVE_COUNCIL">Executive Council</option>
                    <option value="AGM">Annual General Meeting (AGM)</option>
                    <option value="CLASS_SET_ASSEMBLY">Class Set Assembly</option>
                    <option value="COMMITTEE">Standing Committee</option>
                    <option value="EMERGENCY">Emergency Session</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Scope</label>
                  <select
                    value={newMeetingScope}
                    onChange={(e) => setNewMeetingScope(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                  >
                    <option value="ASSOCIATION">Association-Wide</option>
                    <option value="CLASS_SET">Class-Set Scope</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Location / Venue</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Quorum Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={quorumRequired}
                    onChange={(e) => setQuorumRequired(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Virtual Video Room</label>
                  <input
                    type="text"
                    value={virtualUrl}
                    onChange={(e) => setVirtualUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewMeetingModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium shadow"
                >
                  Confirm &amp; Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DRAFT MINUTES */}
      {showDraftMinuteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Draft Minutes Record</h2>
              <button onClick={() => setShowDraftMinuteModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-4 text-xs">
              <p className="text-slate-400">
                Session: <strong className="text-white">{selectedMeetingDetail?.title}</strong>
              </p>
              <textarea
                rows={12}
                value={minuteBody}
                onChange={(e) => setMinuteBody(e.target.value)}
                placeholder="Type formal minutes, recording opening remarks, quorum count, deliberations, motions and adjournment..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white font-mono leading-relaxed"
              ></textarea>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowDraftMinuteModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDraftMinutes}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium shadow"
                >
                  Save Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADOPT MINUTES */}
      {showAdoptMinuteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Formally Adopt &amp; Seal Minutes</h2>
              <button onClick={() => setShowAdoptMinuteModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Adopting minutes is a permanent statutory action. An immutable SHA-256 cryptographic digest will be computed and sealed to the blockchain/audit ledger.
                </span>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Motion Proposed By (Officer / Member)</label>
                <input
                  type="text"
                  value={proposerId}
                  onChange={(e) => setProposerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Motion Seconded By (Officer / Member)</label>
                <input
                  type="text"
                  value={seconderId}
                  onChange={(e) => setSeconderId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Presiding Officer Signatory</label>
                  <input
                    type="text"
                    value={presidingId}
                    onChange={(e) => setPresidingId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Recording Secretary Signatory</label>
                  <input
                    type="text"
                    value={secretaryId}
                    onChange={(e) => setSecretaryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowAdoptMinuteModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdoptMinutes}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium shadow flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4" /> Seal &amp; Adopt Minutes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PASS RESOLUTION */}
      {showNewResolutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Record Statutory Resolution</h2>
              <button onClick={() => setShowNewResolutionModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateResolution} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Resolution Title</label>
                <input
                  type="text"
                  required
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="e.g. Science Laboratory Grant Authorization"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={resCategory}
                    onChange={(e) => setResCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                  >
                    <option value="GOVERNANCE">Governance</option>
                    <option value="PROJECT">Infrastructure / Project</option>
                    <option value="FINANCIAL">Financial Authorization</option>
                    <option value="CONSTITUTIONAL">Constitutional Policy</option>
                    <option value="WELFARE">Welfare Standard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Binding Scope</label>
                  <select
                    value={resBindingScope}
                    onChange={(e) => setResBindingScope(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                  >
                    <option value="ASSOCIATION">Association-Wide</option>
                    <option value="CLASS_SET">Class-Set Bound</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Effective Date</label>
                <input
                  type="date"
                  required
                  value={resEffectiveDate}
                  onChange={(e) => setResEffectiveDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Formal Resolution Text</label>
                <textarea
                  required
                  rows={4}
                  value={resDesc}
                  onChange={(e) => setResDesc(e.target.value)}
                  placeholder="It is hereby resolved by the National Executive Council that..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewResolutionModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium shadow"
                >
                  Record Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW ACTION TASK */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Assign Action Item</h2>
              <button onClick={() => setShowNewTaskModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Disburse Phase 1 STEM Equipment Advance"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                  >
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Task Instructions</label>
                <textarea
                  rows={3}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Specify actionable steps and deliverable criteria..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium shadow"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD AGENDA */}
      {showAddAgendaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Add Agenda Item</h2>
              <button onClick={() => setShowAddAgendaModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddAgenda} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Agenda Title</label>
                <input
                  type="text"
                  required
                  value={agendaTitle}
                  onChange={(e) => setAgendaTitle(e.target.value)}
                  placeholder="e.g. Review of Alumni Trust Accounts"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={agendaDuration}
                  onChange={(e) => setAgendaDuration(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={agendaDesc}
                  onChange={(e) => setAgendaDesc(e.target.value)}
                  placeholder="Key discussion points..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddAgendaModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium shadow"
                >
                  Add Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD ATTENDANCE */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Record Session Sign-in</h2>
              <button onClick={() => setShowAttendanceModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleRecordAttendance} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Member Identity ID</label>
                <input
                  type="text"
                  required
                  value={attIdentityId}
                  onChange={(e) => setAttIdentityId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Role in Session</label>
                  <select
                    value={attRole}
                    onChange={(e) => setAttRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="PRESIDING_OFFICER">Presiding Officer</option>
                    <option value="SECRETARY">Secretary</option>
                    <option value="EXECUTIVE">Executive Member</option>
                    <option value="MEMBER">Standard Member</option>
                    <option value="OBSERVER">Observer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Attendance Status</label>
                  <select
                    value={attStatus}
                    onChange={(e) => setAttStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="LATE">Late</option>
                    <option value="APOLOGY">Apology</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium shadow"
                >
                  Record Sign-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

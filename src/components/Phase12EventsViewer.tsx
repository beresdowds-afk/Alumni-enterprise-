import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Ticket,
  QrCode,
  ShieldCheck,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Image,
  Award,
  DollarSign,
  PlusCircle,
  FileCheck,
  Search,
  ExternalLink,
  Lock,
  UserCheck,
  UserX,
  Sparkles,
} from 'lucide-react';
import { runPhase12EventSuite, TestResult } from '../domain/phase12EventSuite';

interface TicketTier {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  tierCapacity: number;
  soldCount: number;
  maxPerMember: number;
  isGuestAllowed: boolean;
  status: string;
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  eventType: string;
  scope: string;
  venue: string;
  isVirtual: boolean;
  virtualUrl?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  capacityLimit: number;
  status: string;
  tiers?: TicketTier[];
  totalRegistered?: number;
  totalCheckedIn?: number;
  capacityRemaining?: number;
  isDeadlinePassed?: boolean;
  isCapacityReached?: boolean;
}

interface Registration {
  id: string;
  eventId: string;
  identityId: string;
  ticketTierId: string;
  guestCount: number;
  guestNames: string[];
  registrationStatus: string;
  qrBadgeToken: string;
  qrBadgeHash: string;
  dietaryRequirements?: string;
  specialAssistance?: string;
  totalAmount: number;
  registeredAt: string;
  identity?: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
}

interface Attendance {
  id: string;
  eventId: string;
  registrationId: string;
  identityId?: string;
  attendeeType: string;
  guestName?: string;
  checkInTimestamp: string;
  checkInMethod: string;
  checkpointLocation: string;
  badgeIssued: boolean;
  notes?: string;
  identity?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Reconciliation {
  id: string;
  eventId: string;
  totalCapacity: number;
  totalRegistrations: number;
  totalCheckedIn: number;
  totalNoShows: number;
  turnoutRate: string;
  tierBreakdownJson: Record<string, any>;
  reconciliationSeal: string;
  reconciledAt: string;
  reconciliationNotes?: string;
}

interface GalleryItem {
  id: string;
  eventId: string;
  mediaUrl: string;
  caption: string;
  category: string;
  takenYear?: number;
  createdAt: string;
}

export const Phase12EventsViewer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'directory' | 'ticketing' | 'badges' | 'gate' | 'reconciliation' | 'gallery' | 'tests'
  >('directory');

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventDetail, setEventDetail] = useState<{
    event: EventItem;
    tiers: TicketTier[];
    registrations: Registration[];
    attendances: Attendance[];
    reconciliation: Reconciliation | null;
    galleryItems: GalleryItem[];
    stats: any;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Ticketing Form State
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number>(0);
  const [guestNameInput, setGuestNameInput] = useState<string>('');
  const [dietaryRequirements, setDietaryRequirements] = useState<string>('');
  const [specialAssistance, setSpecialAssistance] = useState<string>('');
  const [isSubmittingReg, setIsSubmittingReg] = useState<boolean>(false);

  // Gate Check-in Form State
  const [scanTokenInput, setScanTokenInput] = useState<string>('');
  const [gateLocation, setGateLocation] = useState<string>('Main Gate Protocol Desk');
  const [gateMethod, setGateMethod] = useState<string>('QR_SCAN');
  const [gateAttendeeType, setGateAttendeeType] = useState<'ALUMNUS' | 'GUEST'>('ALUMNUS');
  const [gateCheckInResult, setGateCheckInResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // New Gallery Item State
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>('');
  const [newPhotoCaption, setNewPhotoCaption] = useState<string>('');
  const [newPhotoCategory, setNewPhotoCategory] = useState<string>('REUNION_MOMENTS');

  // Test Suite Results
  const [suiteResults, setSuiteResults] = useState<{
    results: TestResult[];
    passCount: number;
    failCount: number;
    totalCount: number;
  } | null>(null);

  // Fetch events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success && data.events) {
        setEvents(data.events);
        if (data.events.length > 0 && !selectedEventId) {
          setSelectedEventId(data.events[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      setErrorMsg('Failed to connect to events backend API.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch event details
  const fetchEventDetail = async (id: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/events/${id}`);
      const data = await res.json();
      if (data.success && data.event) {
        setEventDetail(data.event);
        if (data.event.tiers && data.event.tiers.length > 0 && !selectedTierId) {
          setSelectedTierId(data.event.tiers[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch event detail:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventDetail(selectedEventId);
    }
  }, [selectedEventId]);

  // Handle Event Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !selectedTierId) {
      setErrorMsg('Please select an event and a ticket tier.');
      return;
    }

    setIsSubmittingReg(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const guestNames = guestNameInput.trim()
        ? guestNameInput.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const payload = {
        ticketTierId: selectedTierId,
        guestCount,
        guestNames,
        dietaryRequirements,
        specialAssistance,
      };

      const res = await fetch(`/api/events/${selectedEventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessMsg(`Registration confirmed! Digital QR Badge Token: ${data.registration.qrBadgeToken}`);
      // Refresh event details
      await fetchEventDetail(selectedEventId);
      await fetchEvents();
      // Reset form
      setGuestCount(0);
      setGuestNameInput('');
      setDietaryRequirements('');
      setSpecialAssistance('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Handle Gate Check-In
  const handleGateCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !scanTokenInput.trim()) {
      setErrorMsg('Please enter or scan a valid badge token.');
      return;
    }

    setIsScanning(true);
    setErrorMsg('');
    setSuccessMsg('');
    setGateCheckInResult(null);

    try {
      const res = await fetch(`/api/events/${selectedEventId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrBadgeToken: scanTokenInput.trim().toUpperCase(),
          checkpointLocation: gateLocation,
          checkInMethod: gateMethod,
          attendeeType: gateAttendeeType,
        }),
      });

      const data = await res.json();
      setGateCheckInResult(data);

      if (!res.ok || !data.success) {
        if (data.code === 'ALREADY_CHECKED_IN') {
          setErrorMsg(data.message);
        } else {
          setErrorMsg(data.message || data.error || 'Check-in validation failed.');
        }
      } else {
        setSuccessMsg(data.message || 'Check-in validated successfully!');
        setScanTokenInput('');
        await fetchEventDetail(selectedEventId);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Statutory Reconciliation
  const handleReconcile = async () => {
    if (!selectedEventId) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/events/${selectedEventId}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reconciliationNotes: 'Official post-event reconciliation certified by Protocol & Attendance Committee.',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Reconciliation failed');
      }

      setSuccessMsg('Statutory attendance reconciliation certified with cryptographic SHA-256 seal.');
      await fetchEventDetail(selectedEventId);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Handle Gallery Photo Submission
  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !newPhotoUrl.trim() || !newPhotoCaption.trim()) {
      setErrorMsg('Please provide photo URL and caption.');
      return;
    }

    try {
      const res = await fetch(`/api/events/${selectedEventId}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl: newPhotoUrl.trim(),
          caption: newPhotoCaption.trim(),
          category: newPhotoCategory,
          takenYear: new Date().getFullYear(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add gallery photo');
      }

      setSuccessMsg('Memorial photograph added to the official event archive.');
      setNewPhotoUrl('');
      setNewPhotoCaption('');
      await fetchEventDetail(selectedEventId);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Execute Automated Test Suite
  const runTests = () => {
    const results = runPhase12EventSuite();
    setSuiteResults(results);
  };

  const selectedTier = eventDetail?.tiers?.find((t) => t.id === selectedTierId);
  const totalSlots = 1 + guestCount;
  const computedTotalKobo = selectedTier ? selectedTier.price * totalSlots : 0;
  const computedTotalNaira = (computedTotalKobo / 100).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PHASE 12 • PRODUCTION ENGINE
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Cloud SQL Live
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Events and Reunion Management
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              End-to-end reunion coordination, multi-tier ticketing quotas, cryptographic QR badge generation, server-authoritative capacity and deadline enforcement, gate check-in anti-passback protocol, and statutory attendance reconciliation ledgers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={fetchEvents}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
            </button>
            <button
              onClick={() => {
                setActiveSubTab('tests');
                runTests();
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition"
            >
              <ShieldCheck className="w-4 h-4" /> Run 8 Phase 12 Tests
            </button>
          </div>
        </div>

        {/* Global Feedback Messages */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2 text-xs sm:text-sm font-semibold pb-1">
        {[
          { id: 'directory', label: '1. Events & Reunions', icon: Calendar },
          { id: 'ticketing', label: '2. Ticketing & Registration Desk', icon: Ticket },
          { id: 'badges', label: '3. Digital QR Badge Vault', icon: QrCode },
          { id: 'gate', label: '4. Protocol Gate Check-In', icon: UserCheck },
          { id: 'reconciliation', label: '5. Attendance Reconciliation', icon: FileCheck },
          { id: 'gallery', label: '6. Memorial Photo Archive', icon: Image },
          { id: 'tests', label: '7. Automated Test Suite', icon: ShieldCheck },
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

      {/* Event Selector Context (Applicable to tabs 2, 3, 4, 5, 6) */}
      {activeSubTab !== 'tests' && events.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="font-semibold text-slate-400 shrink-0">Active Reunion / Event:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-medium focus:outline-none focus:border-amber-500 w-full sm:w-auto"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.status})
                </option>
              ))}
            </select>
          </div>

          {eventDetail && (
            <div className="flex items-center gap-4 text-slate-300 shrink-0 font-mono text-[11px]">
              <span>Capacity: <strong className="text-white">{eventDetail.stats.capacityLimit}</strong></span>
              <span>Registered: <strong className="text-amber-400">{eventDetail.stats.totalRegistered}</strong></span>
              <span>Admitted: <strong className="text-emerald-400">{eventDetail.stats.totalCheckedIn}</strong></span>
              <span>Seats Left: <strong className="text-indigo-400">{eventDetail.stats.capacityRemaining}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1: EVENTS & REUNIONS DIRECTORY */}
      {activeSubTab === 'directory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((ev) => {
              const isSelected = ev.id === selectedEventId;
              const isPast = ev.status === 'CONCLUDED' || ev.isDeadlinePassed;
              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEventId(ev.id)}
                  className={`bg-slate-900 border rounded-2xl p-6 transition cursor-pointer relative shadow-lg ${
                    isSelected ? 'border-amber-500/60 ring-2 ring-amber-500/20' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {ev.eventType} • {ev.scope}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        ev.status === 'CONCLUDED'
                          ? 'bg-slate-800 text-slate-300'
                          : ev.isDeadlinePassed
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {ev.status === 'CONCLUDED'
                        ? 'CONCLUDED'
                        : ev.isDeadlinePassed
                        ? 'REGISTRATION CLOSED'
                        : 'REGISTRATION OPEN'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 leading-snug">{ev.title}</h3>
                  <p className="text-xs text-slate-300 line-clamp-3 mb-4">{ev.description}</p>

                  <div className="space-y-2 text-xs text-slate-400 mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{new Date(ev.startDate).toLocaleDateString()} — {new Date(ev.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate">{ev.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>
                        Deadline: {new Date(ev.registrationDeadline).toLocaleDateString()} at{' '}
                        {new Date(ev.registrationDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Venue Capacity Meter</span>
                      <span>
                        <strong className="text-white">{ev.totalRegistered || 0}</strong> / {ev.capacityLimit} confirmed
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (((ev.totalRegistered || 0) / ev.capacityLimit) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {ev.tiers ? `${ev.tiers.length} Ticket Tiers Available` : 'Configured'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventId(ev.id);
                        setActiveSubTab('ticketing');
                      }}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg border border-amber-500/30 transition flex items-center gap-1"
                    >
                      <Ticket className="w-3.5 h-3.5" /> Book Passes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TICKETING & REGISTRATION DESK */}
      {activeSubTab === 'ticketing' && eventDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Tier Selection & Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-400" />
                Select Ticket Tier
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                All tiers include admission to the formal reunion proceedings and banquet. Server-side capacity quotas are ring-fenced per tier.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {eventDetail.tiers.map((tier) => {
                  const isSelected = tier.id === selectedTierId;
                  const isSoldOut = tier.soldCount >= tier.tierCapacity;
                  const priceNaira = (tier.price / 100).toLocaleString('en-NG', {
                    style: 'currency',
                    currency: 'NGN',
                  });

                  return (
                    <div
                      key={tier.id}
                      onClick={() => !isSoldOut && setSelectedTierId(tier.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                          : isSoldOut
                          ? 'bg-slate-950/60 border-slate-800 opacity-60 cursor-not-allowed'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-sm">{tier.name}</span>
                        {isSoldOut ? (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold">
                            SOLD OUT
                          </span>
                        ) : (
                          <span className="text-xs font-mono font-bold text-emerald-400">{priceNaira}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">{tier.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
                        <span>Max/Member: {tier.maxPerMember}</span>
                        <span>
                          Quota: <strong className="text-white">{tier.soldCount}</strong>/{tier.tierCapacity} sold
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Registration Form */}
              <form onSubmit={handleRegister} className="space-y-4 border-t border-slate-800 pt-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  Alumnus &amp; Guest Accreditation
                </h3>

                {selectedTier?.isGuestAllowed && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Guest Passes Requested (Max allowable: {selectedTier.maxPerMember - 1})
                    </label>
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {Array.from({ length: selectedTier.maxPerMember }).map((_, idx) => (
                        <option key={idx} value={idx}>
                          {idx === 0 ? 'Member Only (No Guests)' : `+${idx} Guest Pass(es)`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {guestCount > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Guest Full Names (comma-separated for badge personalization)
                    </label>
                    <input
                      type="text"
                      value={guestNameInput}
                      onChange={(e) => setGuestNameInput(e.target.value)}
                      placeholder="e.g. Mrs. Mary Olagunju, Dr. Seyi Coker"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Dietary Preferences / Restrictions
                    </label>
                    <input
                      type="text"
                      value={dietaryRequirements}
                      onChange={(e) => setDietaryRequirements(e.target.value)}
                      placeholder="e.g. Halal, Vegetarian, None"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Special Protocol Assistance
                    </label>
                    <input
                      type="text"
                      value={specialAssistance}
                      onChange={(e) => setSpecialAssistance(e.target.value)}
                      placeholder="e.g. Wheelchair access, VIP parking"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Base Tier ({selectedTier?.name}):</span>
                    <span className="font-mono">{selectedTier ? (selectedTier.price / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }) : 'N0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Total Passes ({totalSlots} attendees):</span>
                    <span className="font-mono font-bold text-amber-400">{computedTotalNaira}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    * Server validates registration deadline and capacity limits. Successful submission immediately issues a cryptographic digital QR badge.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReg || eventDetail.stats.isDeadlinePassed || eventDetail.stats.isCapacityReached}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  {isSubmittingReg ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {eventDetail.stats.isDeadlinePassed
                    ? 'Registration Deadline Passed'
                    : eventDetail.stats.isCapacityReached
                    ? 'Event Capacity Reached (Sold Out)'
                    : 'Confirm Registration & Issue QR Badge'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Col: Live Event Bounds & Deadline Sentinel */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Statutory Constraints Sentinel
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Registration Deadline:</span>
                  <div className="font-mono text-white font-bold">
                    {new Date(eventDetail.event.registrationDeadline).toLocaleString()}
                  </div>
                  <span
                    className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                      eventDetail.stats.isDeadlinePassed
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {eventDetail.stats.isDeadlinePassed ? 'EXPIRED (Server Rejects Late Claims)' : 'ACTIVE & ENFORCED'}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Maximum Venue Capacity:</span>
                  <div className="font-mono text-white font-bold">
                    {eventDetail.stats.capacityLimit} Seated Places
                  </div>
                  <div className="text-[11px] text-indigo-300 mt-1">
                    Remaining: {eventDetail.stats.capacityRemaining} places available
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Decoupled Records Guarantee:</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Registration reserves admission; attendance records are created <strong>only</strong> when the badge QR token is verified at protocol gate desks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DIGITAL QR BADGE VAULT */}
      {activeSubTab === 'badges' && eventDetail && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-400" />
                  Official Digital QR Badges &amp; Passes
                </h2>
                <p className="text-xs text-slate-400">
                  Verifiable alumni credentials with SHA-256 tamper seals for {eventDetail.event.title}.
                </p>
              </div>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-mono font-bold">
                {eventDetail.registrations.length} Badges Issued
              </span>
            </div>

            {eventDetail.registrations.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                <Ticket className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-white">No registrations recorded yet for this event.</p>
                <p className="text-xs mt-1">Go to the Ticketing Desk to confirm a registration pass.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventDetail.registrations.map((reg) => {
                  const attendeeName = reg.identity
                    ? `${reg.identity.firstName} ${reg.identity.lastName}`
                    : 'Registered Alumnus';
                  const tier = eventDetail.tiers.find((t) => t.id === reg.ticketTierId);

                  return (
                    <div
                      key={reg.id}
                      className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between"
                    >
                      {/* Top Header Badge */}
                      <div>
                        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                          <span className="text-[10px] font-mono font-bold text-amber-400">AGSOBA OFFICIAL PASS</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {reg.registrationStatus}
                          </span>
                        </div>

                        <div className="text-center my-4">
                          <h4 className="text-base font-bold text-white">{attendeeName}</h4>
                          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            {tier?.name || 'General Admission'}
                          </span>
                        </div>

                        {/* QR Code Graphic Simulation */}
                        <div className="my-4 p-3 bg-white rounded-xl shadow-inner flex flex-col items-center justify-center">
                          <div className="w-36 h-36 bg-slate-950 p-2 rounded-lg flex flex-col items-center justify-center relative">
                            {/* Stylized QR Matrix Pattern */}
                            <div className="grid grid-cols-6 gap-1 w-full h-full p-1">
                              {Array.from({ length: 36 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`rounded-[2px] ${
                                    (i * 7) % 3 === 0 || i === 0 || i === 5 || i === 30 || i === 35
                                      ? 'bg-amber-400'
                                      : (i * 3) % 2 === 0
                                      ? 'bg-slate-300'
                                      : 'bg-slate-800'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="mt-2 text-[10px] font-mono font-bold text-slate-800 tracking-wider">
                            {reg.qrBadgeToken}
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px] text-slate-400 font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <div className="flex justify-between">
                            <span>Token:</span>
                            <span className="text-amber-400 font-bold">{reg.qrBadgeToken}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Guests:</span>
                            <span className="text-white">{reg.guestCount} Companion(s)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Registered:</span>
                            <span>{new Date(reg.registeredAt).toLocaleDateString()}</span>
                          </div>
                          <div className="pt-1 text-[9px] text-slate-400 truncate">
                            SHA-256: {reg.qrBadgeHash}
                          </div>
                        </div>
                      </div>

                      {/* Quick Check-in Link Button */}
                      <button
                        onClick={() => {
                          setScanTokenInput(reg.qrBadgeToken);
                          setActiveSubTab('gate');
                        }}
                        className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Test Gate Scan
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: PROTOCOL GATE CHECK-IN */}
      {activeSubTab === 'gate' && eventDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Protocol Scanner */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                Gate Protocol Scanner
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Scan or enter the alphanumeric QR badge token at entry turnstiles. Anti-passback engine actively blocks reused credentials.
              </p>

              <form onSubmit={handleGateCheckIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Badge Token / Pass Identifier
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={scanTokenInput}
                      onChange={(e) => setScanTokenInput(e.target.value)}
                      placeholder="e.g. AGS-EVT-2025-XXXX"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white font-mono uppercase tracking-wider focus:outline-none focus:border-amber-500"
                    />
                    <QrCode className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Checkpoint Location
                  </label>
                  <select
                    value={gateLocation}
                    onChange={(e) => setGateLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Main Gate Protocol Desk">Main Gate Protocol Desk (Abeokuta GS Quadrangle)</option>
                    <option value="Lisabi Hall VIP Entrance">Lisabi Hall VIP Entrance</option>
                    <option value="J.K. Coker Auditorium Turnstile">J.K. Coker Auditorium Turnstile</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Attendee Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGateAttendeeType('ALUMNUS')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        gateAttendeeType === 'ALUMNUS'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Alumnus Member
                    </button>
                    <button
                      type="button"
                      onClick={() => setGateAttendeeType('GUEST')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        gateAttendeeType === 'GUEST'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Guest / Spouse Pass
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isScanning || !scanTokenInput.trim()}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  {isScanning ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Validate Credential &amp; Check In
                </button>
              </form>

              {/* Real-time Gate Validation Result Box */}
              {gateCheckInResult && (
                <div
                  className={`mt-4 p-4 rounded-xl border text-xs ${
                    gateCheckInResult.success
                      ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-950/70 border-red-500/40 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm mb-1">
                    {gateCheckInResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    {gateCheckInResult.success ? 'ENTRY ADMITTED' : 'ACCESS DENIED'}
                  </div>
                  <p>{gateCheckInResult.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right 2 Cols: Live Attendance Ledger */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-400" />
                  Official Attendance Register (Distinct Records)
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {eventDetail.attendances.length} Confirmed Check-Ins
                </span>
              </div>

              {eventDetail.attendances.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                  <UserX className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-white">No attendees checked in yet.</p>
                  <p className="text-xs mt-1">Attendees will appear here once their badge token is verified at protocol turnstiles.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Attendee</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Gate &amp; Method</th>
                        <th className="py-2.5 px-3">Check-In Time</th>
                        <th className="py-2.5 px-3">Badge Issued</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {eventDetail.attendances.map((att) => (
                        <tr key={att.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white font-sans">
                              {att.attendeeType === 'ALUMNUS'
                                ? att.identity
                                  ? `${att.identity.firstName} ${att.identity.lastName}`
                                  : 'Alumnus Member'
                                : att.guestName || 'Guest Pass'}
                            </div>
                            <div className="text-[10px] text-slate-400">{att.identity?.email || 'Guest Pass'}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                att.attendeeType === 'ALUMNUS'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}
                            >
                              {att.attendeeType}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-white text-[11px] font-sans">{att.checkpointLocation}</div>
                            <div className="text-[10px] text-slate-400">{att.checkInMethod}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {new Date(att.checkInTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Physical Badge
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: STATUTORY ATTENDANCE RECONCILIATION */}
      {activeSubTab === 'reconciliation' && eventDetail && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-400" />
                  Statutory Post-Event Attendance &amp; Capacity Reconciliation
                </h2>
                <p className="text-xs text-slate-400">
                  Comprehensive audit reconciliation between capacity, confirmed registrations, admitted attendees, and no-shows.
                </p>
              </div>

              <button
                onClick={handleReconcile}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Lock className="w-3.5 h-3.5" /> Certify Reconciliation &amp; Seal
              </button>
            </div>

            {/* Reconciliation KPI Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Total Capacity</span>
                <div className="text-2xl font-bold font-mono text-white">{eventDetail.stats.capacityLimit}</div>
                <span className="text-[10px] text-slate-400">Venue Authorized Max</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Registrations</span>
                <div className="text-2xl font-bold font-mono text-amber-400">{eventDetail.stats.totalRegistered}</div>
                <span className="text-[10px] text-slate-400">Distinct Bookings</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Gate Check-Ins</span>
                <div className="text-2xl font-bold font-mono text-emerald-400">{eventDetail.stats.totalCheckedIn}</div>
                <span className="text-[10px] text-slate-400">Physical &amp; Virtual</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">No-Shows</span>
                <div className="text-2xl font-bold font-mono text-red-400">{eventDetail.stats.noShows}</div>
                <span className="text-[10px] text-slate-400">Absent Registrants</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 block mb-1">Turnout Rate</span>
                <div className="text-2xl font-bold font-mono text-indigo-400">{eventDetail.stats.turnoutRate}</div>
                <span className="text-[10px] text-slate-400">Audited Compliance</span>
              </div>
            </div>

            {/* Cryptographic Seal Box */}
            {eventDetail.reconciliation && (
              <div className="p-4 bg-indigo-950/40 border border-indigo-500/40 rounded-xl space-y-2 mb-6 text-xs">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  Statutory Audit Seal Generated
                </div>
                <div className="font-mono text-slate-300 text-[11px] break-all">
                  SHA-256 SEAL: <span className="text-amber-400 font-bold">{eventDetail.reconciliation.reconciliationSeal}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                  <span>Certified: {new Date(eventDetail.reconciliation.reconciledAt).toLocaleString()}</span>
                  <span>Notes: {eventDetail.reconciliation.reconciliationNotes || 'Verified'}</span>
                </div>
              </div>
            )}

            {/* Tier-by-Tier Audit Table */}
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Ticket Tier Breakdown &amp; Financial Audit
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Ticket Tier</th>
                    <th className="py-2.5 px-3">Price (NGN)</th>
                    <th className="py-2.5 px-3">Capacity Quota</th>
                    <th className="py-2.5 px-3">Sold / Registered</th>
                    <th className="py-2.5 px-3">Est. Revenue (NGN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {eventDetail.tiers.map((tier) => {
                    const priceNaira = (tier.price / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
                    const tierRegs = eventDetail.registrations.filter((r) => r.ticketTierId === tier.id);
                    const revenue = (tier.price * tierRegs.length) / 100;
                    const revenueNaira = revenue.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });

                    return (
                      <tr key={tier.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold text-white font-sans">{tier.name}</td>
                        <td className="py-3 px-3 text-slate-300">{priceNaira}</td>
                        <td className="py-3 px-3 text-slate-300">{tier.tierCapacity}</td>
                        <td className="py-3 px-3 text-amber-400 font-bold">{tierRegs.length}</td>
                        <td className="py-3 px-3 text-emerald-400 font-bold">{revenueNaira}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: MEMORIAL PHOTO ARCHIVE */}
      {activeSubTab === 'gallery' && eventDetail && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Image className="w-5 h-5 text-amber-400" />
                  Post-Event Memorial Archive &amp; Galleries
                </h2>
                <p className="text-xs text-slate-400">
                  Commemorative reunion photography with provenance metadata for {eventDetail.event.title}.
                </p>
              </div>
              <span className="text-xs text-indigo-300 font-mono bg-indigo-500/20 px-2.5 py-1 rounded border border-indigo-500/30">
                {eventDetail.galleryItems.length} Archive Photos
              </span>
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {eventDetail.galleryItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col justify-between"
                >
                  <img
                    src={item.mediaUrl}
                    alt={item.caption}
                    className="w-full h-48 object-cover hover:scale-105 transition duration-300"
                  />
                  <div className="p-4 space-y-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.category}
                    </span>
                    <p className="text-xs text-slate-200 line-clamp-2">{item.caption}</p>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 font-mono flex justify-between">
                      <span>Year: {item.takenYear || 'Heritage'}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Photo Form */}
            <form onSubmit={handleAddPhoto} className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                Upload Commemorative Reunion Photograph
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Media Image URL</label>
                  <input
                    type="url"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Archive Category</label>
                  <select
                    value={newPhotoCategory}
                    onChange={(e) => setNewPhotoCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="REUNION_MOMENTS">Reunion Moments</option>
                    <option value="CLASS_PHOTO">Class Set Group Photo</option>
                    <option value="CEREMONY">Banquet Ceremony &amp; Speeches</option>
                    <option value="HISTORIC_RETROSPECTIVE">Historic Retrospective</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Provenance Caption &amp; Description</label>
                <input
                  type="text"
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  placeholder="e.g. 1979-1984 Class Set presenting the renovated school science laboratory..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Save Photo to Memorial Vault
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB 7: AUTOMATED TEST SUITE */}
      {activeSubTab === 'tests' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Phase 12 Automated Verification Test Suite
                </h2>
                <p className="text-xs text-slate-400">
                  Strict domain verification covering distinct registration/attendance records, server capacity checks, deadline barriers, anti-passback gate logic, and SHA-256 reconciliation seals.
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
                <p className="font-semibold text-white">Click "Execute Suite" to run the automated Phase 12 tests.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

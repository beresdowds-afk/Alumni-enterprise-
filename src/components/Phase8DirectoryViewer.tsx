import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Shield, Mail, Phone, MapPin, Briefcase, ExternalLink, Send, CheckCircle2, AlertTriangle, Lock, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

interface DirectoryMember {
  identityId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  headline: string | null;
  bio: string | null;
  profession: string | null;
  industry: string | null;
  currentCity: string | null;
  currentCountry: string | null;
  linkedInUrl: string | null;
  avatarUrl: string | null;
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  classSetId: string | null;
  classSetDisplay: string | null;
}

export const Phase8DirectoryViewer: React.FC = () => {
  const { firebaseUser, securityContext } = useAuth();
  const { activeTenant } = useTenant();
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [professionFilter, setProfessionFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  // Contact modal state
  const [selectedRecipient, setSelectedRecipient] = useState<DirectoryMember | null>(null);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  // Privacy Settings modal state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showEmailPref, setShowEmailPref] = useState(false);
  const [showPhonePref, setShowPhonePref] = useState(false);
  const [showLocationPref, setShowLocationPref] = useState(true);
  const [privacyConsentPref, setPrivacyConsentPref] = useState(true);

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (professionFilter) params.append('profession', professionFilter);
      if (industryFilter) params.append('industry', industryFilter);
      if (cityFilter) params.append('city', cityFilter);
      params.append('tenantId', activeTenant?.tenantId || 'tenant_ags_abeokuta');

      const res = await fetch(`/api/directory/members?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMembers(data.members);
      } else {
        setError(data.error || 'Failed to retrieve directory');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [searchQuery, professionFilter, industryFilter, cityFilter, activeTenant]);

  const handleSendContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient || !contactMessage) return;

    try {
      const res = await fetch('/api/directory/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientIdentityId: selectedRecipient.identityId,
          subject: contactSubject || 'Alumni Network Connection Inquiry',
          message: contactMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Secure introduction request sent to ${selectedRecipient.firstName} ${selectedRecipient.lastName}.`);
        setSelectedRecipient(null);
        setContactSubject('');
        setContactMessage('');
      } else {
        setError(data.error || 'Failed to send message.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    }
  };

  const handleUpdatePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/directory/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showEmail: showEmailPref,
          showPhone: showPhonePref,
          showLocation: showLocationPref,
          privacyConsent: privacyConsentPref,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Privacy preferences updated successfully.');
        setShowPrivacyModal(false);
        fetchDirectory();
      } else {
        setError(data.error || 'Failed to update privacy settings.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Phase 8: Member Directory &amp; Profiles</h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ACTIVE
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                Searchable alumni directory with granular field-level privacy masking, professional profiles, and secure contact gateways.
              </p>
            </div>
          </div>
          {firebaseUser && (
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
            >
              <Shield className="w-3.5 h-3.5" /> Manage My Privacy
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, headline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Profession (e.g. Engineer)"
              value={professionFilter}
              onChange={(e) => setProfessionFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Industry (e.g. Technology)"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="City (e.g. Lagos)"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-300">
            Alumni Directory Results ({members.length} members found)
          </h3>
          <span className="text-xs text-slate-500 font-mono">Privacy-Masked &amp; GDPR / NDPR Compliant</span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-xs">Loading directory records...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
            No alumni found matching the selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => (
              <div
                key={member.identityId}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4 transition hover:border-amber-500/40"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-base border border-amber-500/40">
                      {member.firstName[0]}
                      {member.lastName[0]}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">
                        {member.firstName} {member.lastName}
                      </h4>
                      <p className="text-xs text-amber-400 font-medium">
                        {member.classSetDisplay || 'AGSOBA Alumnus'}
                      </p>
                    </div>
                  </div>

                  {member.headline && (
                    <p className="text-xs text-slate-300 italic line-clamp-2">{member.headline}</p>
                  )}

                  <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                    {member.profession && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{member.profession} {member.industry ? `(${member.industry})` : ''}</span>
                      </div>
                    )}
                    {member.currentCity && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{member.currentCity}, {member.currentCountry || 'Nigeria'}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-[11px]">{member.email}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" /> Privacy Masked
                  </span>
                  <button
                    onClick={() => setSelectedRecipient(member)}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-amber-500/30 transition"
                  >
                    <Send className="w-3 h-3" /> Connect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Gateway Modal */}
      {selectedRecipient && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-400" /> Secure Introduction to {selectedRecipient.firstName} {selectedRecipient.lastName}
            </h4>
            <form onSubmit={handleSendContact} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder="Connection Inquiry from AGSOBA Network"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Message</label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Introduce yourself and state the reason for connection..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 h-28 resize-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecipient(null)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition shadow"
                >
                  Send Introduction Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Privacy Settings Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" /> Granular Privacy Preferences
            </h4>
            <form onSubmit={handleUpdatePrivacy} className="space-y-4 text-xs">
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-200 font-medium">Show Email Address in Directory</span>
                  <input
                    type="checkbox"
                    checked={showEmailPref}
                    onChange={(e) => setShowEmailPref(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-200 font-medium">Show Phone Number in Directory</span>
                  <input
                    type="checkbox"
                    checked={showPhonePref}
                    onChange={(e) => setShowPhonePref(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-200 font-medium">Show City &amp; Country Location</span>
                  <input
                    type="checkbox"
                    checked={showLocationPref}
                    onChange={(e) => setShowLocationPref(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-200 font-medium">Data Privacy &amp; GDPR/NDPR Consent</span>
                  <input
                    type="checkbox"
                    checked={privacyConsentPref}
                    onChange={(e) => setPrivacyConsentPref(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition shadow"
                >
                  Save Privacy Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

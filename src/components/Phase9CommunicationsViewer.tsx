import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Bell, Send, Plus, CheckCircle2, XCircle, Clock, Shield, AlertCircle, FileText, Settings, Users } from 'lucide-react';

export const Phase9CommunicationsViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'logs' | 'gateways'>('campaigns');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedCampaignLogs, setSelectedCampaignLogs] = useState<any[]>([]);
  const [activeLogCampaignId, setActiveLogCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Campaign Modal state
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newChannel, setNewChannel] = useState('EMAIL');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('');

  // New Template Modal state
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [tmplName, setTmplName] = useState('');
  const [tmplSubject, setTmplSubject] = useState('');
  const [tmplBody, setTmplBody] = useState('');
  const [tmplChannel, setTmplChannel] = useState('EMAIL');
  const [tmplCategory, setTmplCategory] = useState('ANNOUNCEMENT');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cmpRes, tmplRes] = await Promise.all([
        fetch('/api/communications/campaigns?tenantId=tenant_ags_abeokuta'),
        fetch('/api/communications/templates?tenantId=tenant_ags_abeokuta'),
      ]);
      const cmpData = await cmpRes.json();
      const tmplData = await tmplRes.json();
      if (cmpData.success) setCampaigns(cmpData.campaigns);
      if (tmplData.success) setTemplates(tmplData.templates);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/communications/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'tenant_ags_abeokuta',
          associationId: 'asc_agsoba_01',
          title: newTitle,
          channel: newChannel,
          templateId: newTemplateId || undefined,
          subject: newSubject,
          body: newBody,
          recipientSegment: {},
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Campaign created successfully.');
        setShowNewCampaignModal(false);
        setNewTitle('');
        setNewSubject('');
        setNewBody('');
        fetchData();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/communications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'tenant_ags_abeokuta',
          name: tmplName,
          subject: tmplSubject,
          body: tmplBody,
          channel: tmplChannel,
          category: tmplCategory,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Template created successfully.');
        setShowNewTemplateModal(false);
        setTmplName('');
        setTmplSubject('');
        setTmplBody('');
        fetchData();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/communications/campaigns/${campaignId}/send`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Campaign dispatched successfully! Delivered: ${data.campaign.successfulCount}, Failed: ${data.campaign.failedCount}`);
        fetchData();
        loadLogs(campaignId);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadLogs = async (campaignId: string) => {
    setActiveLogCampaignId(campaignId);
    try {
      const res = await fetch(`/api/communications/campaigns/${campaignId}/logs`);
      const data = await res.json();
      if (data.success) {
        setSelectedCampaignLogs(data.logs);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PHASE 9: ENTERPRISE COMMUNICATIONS CENTRE
              </span>
              <h1 className="text-3xl font-bold text-white mt-1">Multi-Channel Broadcast &amp; Delivery Auditing</h1>
              <p className="text-sm text-slate-300 mt-1">
                Manage announcement templates, targeted broadcast queues, automated multi-channel delivery (Email, SMS, Push), and comprehensive audit logs.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewCampaignModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" /> New Broadcast Campaign
            </button>
            <button
              onClick={() => setShowNewTemplateModal(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm flex items-center gap-2 border border-slate-700 transition"
            >
              <FileText className="w-4 h-4" /> New Template
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-3">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'campaigns', label: 'Broadcast Campaigns', icon: Send, count: campaigns.length },
          { id: 'templates', label: 'Announcement Templates', icon: FileText, count: templates.length },
          { id: 'logs', label: 'Delivery Logs & Analytics', icon: Clock },
          { id: 'gateways', label: 'Provider Gateways', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Broadcast Campaigns */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((cmp) => (
              <div key={cmp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {cmp.channel}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                      cmp.status === 'SENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      cmp.status === 'SCHEDULED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {cmp.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{cmp.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">Subject: {cmp.subject}</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Recipients:</span>
                    <span className="text-white font-mono font-bold">{cmp.totalRecipients}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Delivered Successfully:</span>
                    <span className="text-emerald-400 font-mono font-bold">{cmp.successfulCount}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Failed / Bounced:</span>
                    <span className="text-rose-400 font-mono font-bold">{cmp.failedCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  {cmp.status !== 'SENT' && (
                    <button
                      onClick={() => handleSendCampaign(cmp.id)}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition shadow"
                    >
                      <Send className="w-3.5 h-3.5" /> Dispatch Now
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveTab('logs');
                      loadLogs(cmp.id);
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
                  >
                    <Clock className="w-3.5 h-3.5" /> View Logs
                  </button>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
                <Mail className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-lg font-medium text-white">No broadcast campaigns found</p>
                <p className="text-sm mt-1">Create your first broadcast campaign to begin messaging alumni.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Announcement Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {tmpl.channel}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300">
                  {tmpl.category}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{tmpl.name}</h3>
                <p className="text-xs text-indigo-400 mt-1 font-medium">Subject: {tmpl.subject}</p>
              </div>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                {tmpl.body}
              </div>
              <button
                onClick={() => {
                  setNewTemplateId(tmpl.id);
                  setNewSubject(tmpl.subject);
                  setNewBody(tmpl.body);
                  setNewChannel(tmpl.channel);
                  setNewTitle(`Campaign via ${tmpl.name}`);
                  setShowNewCampaignModal(true);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium border border-slate-700 flex items-center justify-center gap-2 transition"
              >
                <Send className="w-3.5 h-3.5" /> Use Template for Campaign
              </button>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
              <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-lg font-medium text-white">No announcement templates</p>
              <p className="text-sm mt-1">Create reusable templates for announcements and newsletters.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Delivery Logs */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Delivery Audit Logs</h2>
              <p className="text-xs text-slate-400">Inspect individual recipient delivery results, status responses, and audit timestamps.</p>
            </div>
            <select
              value={activeLogCampaignId || ''}
              onChange={(e) => loadLogs(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs"
            >
              <option value="">Select a campaign to view logs...</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.title} ({c.status})</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Log ID</th>
                  <th className="p-3">Recipient Contact</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Provider Response</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {selectedCampaignLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-950/50">
                    <td className="p-3 font-mono text-slate-400">{log.id}</td>
                    <td className="p-3 font-medium text-white">{log.recipientContact}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                        {log.channel}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        log.status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-400">{log.providerResponse || 'N/A'}</td>
                    <td className="p-3 font-mono text-slate-500">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : 'Pending'}
                    </td>
                  </tr>
                ))}
                {selectedCampaignLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Select a campaign above to inspect its delivery audit logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Gateway Configuration */}
      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'SendGrid Email API', type: 'Email Gateway', status: 'CONFIGURED', desc: 'Authoritative transactional email dispatch service for AGSOBA communications.', icon: Mail },
            { name: 'Twilio SMS API', type: 'SMS Gateway', status: 'PENDING_CREDENTIALS', desc: 'Global SMS broadcast and class set notification relay.', icon: MessageSquare },
            { name: 'Firebase Cloud Messaging (FCM)', type: 'Push Notifications', status: 'ACTIVE', desc: 'Real-time mobile push notifications for alumni announcements.', icon: Bell },
          ].map((gw, idx) => {
            const Icon = gw.icon;
            const isReady = gw.status === 'CONFIGURED' || gw.status === 'ACTIVE';
            return (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                    isReady ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {gw.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{gw.name}</h3>
                  <p className="text-xs font-mono text-indigo-400">{gw.type}</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{gw.desc}</p>
                <div className="pt-2 border-t border-slate-800 text-xs flex items-center justify-between text-slate-400">
                  <span>Integration Status:</span>
                  <span className={isReady ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                    {isReady ? 'Operational' : 'Pending API Key'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Campaign Modal */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Create Broadcast Campaign</h2>
              <button onClick={() => setShowNewCampaignModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Annual Founders Day Notice 2026"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Channel</label>
                  <select
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                  >
                    <option value="EMAIL">Email Broadcast</option>
                    <option value="SMS">SMS Broadcast</option>
                    <option value="IN_APP">In-App Notification</option>
                    <option value="PUSH">Push Notification</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Segment</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                  >
                    <option value="ALL">All Active Alumni</option>
                    <option value="VERIFIED">Verified Members Only</option>
                    <option value="CLASS_SET">Specific Class Set</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Subject Line</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Important Update from AGSOBA National"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Message Body</label>
                <textarea
                  required
                  rows={5}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Compose your announcement message here..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white font-mono"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewCampaignModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-600/20"
                >
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Template Modal */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Create Announcement Template</h2>
              <button onClick={() => setShowNewTemplateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                  placeholder="e.g. Standard Chapter Meeting Notice"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Channel</label>
                  <select
                    value={tmplChannel}
                    onChange={(e) => setTmplChannel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="IN_APP">In-App</option>
                    <option value="PUSH">Push</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={tmplCategory}
                    onChange={(e) => setTmplCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                  >
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="EVENT">Event</option>
                    <option value="FUNDRAISING">Fundraising</option>
                    <option value="WELFARE">Welfare</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Default Subject</label>
                <input
                  type="text"
                  required
                  value={tmplSubject}
                  onChange={(e) => setTmplSubject(e.target.value)}
                  placeholder="e.g. Notice of Meeting"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Template Body</label>
                <textarea
                  required
                  rows={5}
                  value={tmplBody}
                  onChange={(e) => setTmplBody(e.target.value)}
                  placeholder="Dear [Alumni Name], ..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white font-mono"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTemplateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-600/20"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

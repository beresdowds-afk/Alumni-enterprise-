import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import {
  Palette,
  Building,
  School,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Lock,
  ArrowRight,
  Save,
} from 'lucide-react';

export const Phase4BrandingViewer: React.FC = () => {
  const { activeTenant, availableTenants, loading, switchTenant, updateBranding, refreshBranding } = useTenant();

  // Customizer form state
  const [schoolName, setSchoolName] = useState<string>('');
  const [assocName, setAssocName] = useState<string>('');
  const [acronym, setAcronym] = useState<string>('');
  const [motto, setMotto] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#0f172a');
  const [accentColor, setAccentColor] = useState<string>('#f59e0b');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [postalAddress, setPostalAddress] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [currency, setCurrency] = useState<string>('NGN');
  const [timezone, setTimezone] = useState<string>('Africa/Lagos');
  const [namingConvention, setNamingConvention] = useState<string>('');

  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Cross-tenant attack test state
  const [attackTesting, setAttackTesting] = useState<boolean>(false);
  const [attackResult, setAttackResult] = useState<any | null>(null);

  // Sync form with active tenant
  React.useEffect(() => {
    if (activeTenant) {
      setSchoolName(activeTenant.schoolName);
      setAssocName(activeTenant.associationName);
      setAcronym(activeTenant.associationAcronym);
      setMotto(activeTenant.brandingConfig.motto || '');
      setPrimaryColor(activeTenant.brandingConfig.primaryColor || '#0f172a');
      setAccentColor(activeTenant.brandingConfig.accentColor || '#f59e0b');
      setContactEmail(activeTenant.brandingConfig.contactEmail || '');
      setContactPhone(activeTenant.brandingConfig.contactPhone || '');
      setPostalAddress(activeTenant.brandingConfig.postalAddress || '');
      setWebsite(activeTenant.brandingConfig.website || '');
      setCurrency(activeTenant.defaultCurrency || 'NGN');
      setTimezone(activeTenant.defaultTimezone || 'Africa/Lagos');
      setNamingConvention(activeTenant.brandingConfig.historicalNamingConvention || '');
    }
  }, [activeTenant]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    const res = await updateBranding({
      schoolName,
      associationName: assocName,
      associationAcronym: acronym,
      defaultCurrency: currency,
      defaultTimezone: timezone,
      brandingConfig: {
        motto,
        primaryColor,
        accentColor,
        contactEmail,
        contactPhone,
        postalAddress,
        website,
        historicalNamingConvention: namingConvention,
      },
    });

    setSaving(false);
    if (res.success) {
      setSaveMessage('Branding configuration successfully committed to Cloud SQL PostgreSQL!');
      setTimeout(() => setSaveMessage(null), 4000);
    } else {
      setSaveError(res.error || 'Failed to persist branding.');
    }
  };

  const runCrossTenantAttackTest = async () => {
    setAttackTesting(true);
    setAttackResult(null);
    try {
      const res = await fetch('/api/test/cross-tenant-isolation', { method: 'POST' });
      const data = await res.json();
      setAttackResult(data);
    } catch (e: any) {
      setAttackResult({ error: e.message });
    } finally {
      setAttackTesting(false);
    }
  };

  if (!activeTenant && loading) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
        Loading tenant branding configuration from Cloud SQL...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Multi-School Tenant Switcher */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">
                Phase 4: School &amp; Association Branding Configuration
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Zero Hardcoding Rule: School names, acronyms, crests, colors, currencies, and policies configured via database
            </p>
          </div>

          {/* Tenant Switcher Control */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 rounded-lg text-xs">
            <span className="text-slate-400 font-mono text-[11px] px-2">Active School Tenant:</span>
            {availableTenants.map((t) => {
              const isSelected = activeTenant?.tenantId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => switchTenant(t.id)}
                  className={`px-3 py-1.5 rounded font-bold transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <School className="w-3.5 h-3.5" />
                  {t.name.split(' ')[0]} ({t.code.toUpperCase()})
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Active Brand Pill Card */}
        {activeTenant && (
          <div
            className="p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg transition-all"
            style={{
              backgroundColor: `${activeTenant.brandingConfig.primaryColor}22`,
              borderColor: `${activeTenant.brandingConfig.accentColor}44`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-md"
                style={{
                  backgroundColor: activeTenant.brandingConfig.primaryColor,
                  color: activeTenant.brandingConfig.accentColor,
                  border: `1px solid ${activeTenant.brandingConfig.accentColor}`,
                }}
              >
                {activeTenant.associationAcronym}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{activeTenant.associationName}</h3>
                <div className="text-xs text-slate-300 font-medium">
                  {activeTenant.schoolName} • <em>&quot;{activeTenant.brandingConfig.motto}&quot;</em>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Currency: <strong className="text-white">{activeTenant.defaultCurrency}</strong> • Timezone: <strong className="text-white">{activeTenant.defaultTimezone}</strong> • Tenant ID: <span className="text-amber-400">{activeTenant.tenantId}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                Primary: <span style={{ color: activeTenant.brandingConfig.accentColor }}>{activeTenant.brandingConfig.primaryColor}</span>
              </div>
              <div className="px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                Accent: <span style={{ color: activeTenant.brandingConfig.accentColor }}>{activeTenant.brandingConfig.accentColor}</span>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Grid: Live Brand Editor vs Cross-Tenant Isolation Enforcement */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Column 1: Live Brand Customizer (7 cols) */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                1. Authorised Tenant Branding Customizer
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                Live Cloud SQL Update
              </span>
            </div>

            {saveMessage && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{saveMessage}</span>
              </div>
            )}
            {saveError && (
              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBranding} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Official School Name</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Association Acronym</label>
                  <input
                    type="text"
                    value={acronym}
                    onChange={(e) => setAcronym(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Official Alumni Association Name</label>
                <input
                  type="text"
                  value={assocName}
                  onChange={(e) => setAssocName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">School Motto / Tagline</label>
                <input
                  type="text"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              {/* Color Palette Controls */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-slate-400 mb-1">Primary Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Accent Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Official Secretariat Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Secretariat Telephone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Default Currency</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Default Timezone</label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Historical Naming Convention Specification</label>
                <input
                  type="text"
                  value={namingConvention}
                  onChange={(e) => setNamingConvention(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-[11px]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving to Cloud SQL...' : 'Save & Update Tenant Branding'}
                </button>
              </div>
            </form>
          </div>

          {/* Column 2: Cross-Tenant Isolation Enforcement Test Lab (5 cols) */}
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                2. Cross-Tenant Isolation Barrier Test
              </h3>
              <span className="text-[10px] font-mono text-red-400 bg-red-950/30 border border-red-500/40 px-2 py-0.5 rounded">
                Section 5 Invariant
              </span>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed text-[11px]">
              <strong>Critical Acceptance Criterion:</strong> &quot;One tenant cannot modify another tenant&apos;s branding.&quot;
              Execute this simulated attack test to verify that the server blocks cross-tenant tampering:
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-white font-mono text-[11px]">Simulated Attack Scenario:</div>
              <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
                <li><strong>Actor:</strong> AGSOBA Association Officer (<code className="text-amber-300">tenant_ags_abeokuta</code>)</li>
                <li><strong>Target:</strong> King&apos;s College Lagos (<code className="text-blue-300">tenant_kc_lagos</code>)</li>
                <li><strong>Action:</strong> Attempt to overwrite King&apos;s College school name &amp; colors</li>
                <li><strong>Expected Server Verdict:</strong> <code className="text-red-400">HTTP 403 CROSS_TENANT_VIOLATION</code></li>
              </ul>

              <button
                onClick={runCrossTenantAttackTest}
                disabled={attackTesting}
                className="w-full mt-2 py-2 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                {attackTesting ? 'Executing Cross-Tenant Attack Test...' : 'Execute Cross-Tenant Barrier Test'}
              </button>
            </div>

            {/* Attack Test Result Output */}
            {attackResult && (
              <div
                className={`p-3.5 rounded-lg border text-xs font-mono space-y-2 ${
                  attackResult.attackPrevented
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/30 border-red-500/40 text-red-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {attackResult.attackPrevented ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    {attackResult.attackPrevented
                      ? 'ISOLATION DEFENSE PASSED (HTTP 403)'
                      : 'SECURITY FAILED: MUTATION PERMITTED'}
                  </span>
                  <span>Status: {attackResult.statusCode}</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {attackResult.attackPrevented
                    ? 'Cross-tenant mutation was strictly rejected by backend authorization before SQL execution. Audit event CROSS_TENANT_MUTATION_ATTEMPT_BLOCKED recorded in PostgreSQL.'
                    : 'Error: Cross tenant attack was not blocked.'}
                </div>
                <pre className="text-[10px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto">
                  {JSON.stringify(attackResult.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

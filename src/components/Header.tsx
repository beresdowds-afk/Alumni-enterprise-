import React from 'react';
import { ShieldCheck, School, Building2, CheckCircle2, Database, KeyRound, Palette, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  passedTests: number;
  totalTests: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  passedTests,
  totalTests,
}) => {
  const { firebaseUser, signInWithGoogle, signOut } = useAuth();
  const { activeTenant } = useTenant();

  const tabs = [
    { id: 'digital-network', label: '17. Professional Network (Active)' },
    { id: 'digital-heritage', label: '16. Digital Heritage Archive' },
    { id: 'projects-initiatives', label: '15. Projects & Initiatives' },
    { id: 'confidential-welfare', label: '14. Confidential Welfare' },
    { id: 'financial-management', label: '13. Financial Management' },
    { id: 'events-reunions', label: '12. Events & Reunions' },
    { id: 'polls-voting', label: '11. Polls & Voting' },
    { id: 'meetings-governance', label: '10. Meetings & Resolutions' },
    { id: 'communications', label: '9. Communications Centre' },
    { id: 'member-directory', label: '8. Member Directory' },
    { id: 'overview', label: '1. Executive Overview' },
    { id: 'database-live', label: '2. Cloud SQL (Live)' },
    { id: 'auth-security', label: '3. Auth & Identity (Live)' },
    { id: 'branding-config', label: '4. Branding Config (Live)' },
    { id: 'eligibility-engine', label: '5. Eligibility Engine' },
    { id: 'registration-verification', label: '6. Registration & Import' },
    { id: 'governance-management', label: '7. Governance & Executives' },
    { id: 'domain', label: 'Relational Schema' },
    { id: 'simulator', label: 'Class Set Lab' },
    { id: 'security', label: 'Security & STRIDE' },
    { id: 'governance', label: 'Governance Scope' },
    { id: 'welfare-finance', label: 'Welfare Specs' },
    { id: 'adrs', label: 'ADRs (001–008)' },
    { id: 'roadmap', label: '20-Phase Roadmap' },
    { id: 'report-phase17', label: 'Phase 17 Report (Active)' },
    { id: 'report-phase16', label: 'Phase 16 Report' },
    { id: 'report-phase15', label: 'Phase 15 Report' },
    { id: 'report-phase14', label: 'Phase 14 Report' },
    { id: 'report-phase13', label: 'Phase 13 Report' },
    { id: 'report-phase12', label: 'Phase 12 Report' },
    { id: 'report-phase11', label: 'Phase 11 Report' },
    { id: 'report-phase10', label: 'Phase 10 Report' },
    { id: 'report-phase9', label: 'Phase 9 Report' },
    { id: 'report-phase8', label: 'Phase 8 Report' },
    { id: 'report-phase7', label: 'Phase 7 Report' },
    { id: 'report-phase6', label: 'Phase 6 Report' },
    { id: 'report-phase5', label: 'Phase 5 Report' },
    { id: 'report-phase4', label: 'Phase 4 Report' },
    { id: 'report-phase3', label: 'Phase 3 Report' },
    { id: 'report-phase2', label: 'Phase 2 Report' },
    { id: 'report-phase1', label: 'Phase 1 Report' },
  ];

  const currentSchoolName = activeTenant?.schoolName || 'Abeokuta Grammar School';
  const currentAssocName = activeTenant?.associationName || 'Abeokuta Grammar School Old Boys Association';
  const currentAcronym = activeTenant?.associationAcronym || 'AGSOBA';
  const accentColor = activeTenant?.brandingConfig?.accentColor || '#f59e0b';
  const location = activeTenant ? `${activeTenant.city || 'Abeokuta'}, ${activeTenant.state || 'Ogun State'}, ${activeTenant.country}` : 'Abeokuta, Ogun State, Nigeria';

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 shadow-xl sticky top-0 z-50">
      {/* Top Notification Bar */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-950 border-b border-blue-800/40 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            PHASE 17 PROFESSIONAL NETWORK &amp; BUSINESS DIRECTORY COMPLETE
          </span>
          <span className="text-slate-300 hidden sm:inline">
            Active School: {currentSchoolName} ({currentAcronym}) • Verified Businesses &amp; Mentorship Schemes
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-300">
          <span className="flex items-center gap-1.5 text-blue-400 font-mono">
            <Palette className="w-3.5 h-3.5" />
            Theme: Dynamic ({currentAcronym})
          </span>
          <span className="flex items-center gap-1.5 text-slate-300 font-mono">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            PostgreSQL: Live
          </span>
          <span className="bg-slate-800/80 px-2 py-0.5 rounded text-amber-300 font-medium border border-amber-500/30">
            Awaiting Phase 18 Authorization
          </span>
        </div>
      </div>

      {/* Main Brand & Identity Header */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-xl p-0.5 shadow-lg flex items-center justify-center shrink-0 transition-colors"
              style={{
                backgroundColor: accentColor,
              }}
            >
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <School className="w-6 h-6" style={{ color: accentColor }} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {currentAssocName}
                </h1>
                <span
                  className="px-2 py-0.5 text-xs font-bold rounded border transition-colors"
                  style={{
                    backgroundColor: `${accentColor}22`,
                    color: accentColor,
                    borderColor: `${accentColor}55`,
                  }}
                >
                  {currentAcronym}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2 mt-0.5">
                <span>School: {currentSchoolName} ({location})</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Multi-Tenant Architecture
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {firebaseUser ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-xs">
                {firebaseUser.photoURL ? (
                  <img src={firebaseUser.photoURL} alt="User" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[11px]">
                    {firebaseUser.email?.[0].toUpperCase()}
                  </div>
                )}
                <div className="pr-1 text-left">
                  <div className="text-[11px] font-bold text-white truncate max-w-[120px]">
                    {firebaseUser.displayName || firebaseUser.email?.split('@')[0]}
                  </div>
                  <div className="text-[9px] text-emerald-400">Authenticated</div>
                </div>
                <button
                  onClick={signOut}
                  title="Sign Out"
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
            )}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-right text-xs hidden sm:block">
              <div className="text-slate-400 text-[10px]">Active Naming Rule</div>
              <div className="font-mono font-bold text-amber-400 text-[11px]">
                {activeTenant?.classSetFormula || '{acronym} {yy_adm}{zz_grad}'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto scrollbar-none pt-4 mt-2 border-t border-slate-800/70">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

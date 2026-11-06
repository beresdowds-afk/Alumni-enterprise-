/**
 * AGSOBA Enterprise Alumni Management Platform
 * Phase 6: Alumni Registration, Verification, and Ingestion (Active)
 *
 * Master Implementation Directive Compliant
 */

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { Header } from './components/Header';
import { ExecutiveOverview } from './components/ExecutiveOverview';
import { Phase2DatabaseViewer } from './components/Phase2DatabaseViewer';
import { Phase3AuthViewer } from './components/Phase3AuthViewer';
import { Phase4BrandingViewer } from './components/Phase4BrandingViewer';
import { Phase5EligibilityViewer } from './components/Phase5EligibilityViewer';
import { Phase6RegistrationVerificationViewer } from './components/Phase6RegistrationVerificationViewer';
import { Phase7GovernanceViewer } from './components/Phase7GovernanceViewer';
import { Phase8DirectoryViewer } from './components/Phase8DirectoryViewer';
import { Phase9CommunicationsViewer } from './components/Phase9CommunicationsViewer';
import { Phase10MeetingsViewer } from './components/Phase10MeetingsViewer';
import { Phase11VotingViewer } from './components/Phase11VotingViewer';
import { Phase12EventsViewer } from './components/Phase12EventsViewer';
import { DomainModelViewer } from './components/DomainModelViewer';
import { ClassSetSimulator } from './components/ClassSetSimulator';
import { SecurityGovernanceViewer } from './components/SecurityGovernanceViewer';
import { WelfareFinanceViewer } from './components/WelfareFinanceViewer';
import { AdrViewer } from './components/AdrViewer';
import { RoadmapViewer } from './components/RoadmapViewer';
import { Phase17NetworkViewer } from './components/Phase17NetworkViewer';
import { Phase17ReportView } from './components/Phase17ReportView';
import { Phase16HeritageViewer } from './components/Phase16HeritageViewer';
import { Phase16ReportView } from './components/Phase16ReportView';
import { Phase15ProjectsViewer } from './components/Phase15ProjectsViewer';
import { Phase15ReportView } from './components/Phase15ReportView';
import { Phase14WelfareViewer } from './components/Phase14WelfareViewer';
import { Phase14ReportView } from './components/Phase14ReportView';
import { Phase13ReportView } from './components/Phase13ReportView';
import { Phase12ReportView } from './components/Phase12ReportView';
import { Phase11ReportView } from './components/Phase11ReportView';
import { Phase10ReportView } from './components/Phase10ReportView';
import { Phase9ReportView } from './components/Phase9ReportView';
import { Phase8ReportView } from './components/Phase8ReportView';
import { Phase7ReportView } from './components/Phase7ReportView';
import { Phase6ReportView } from './components/Phase6ReportView';
import { Phase5ReportView } from './components/Phase5ReportView';
import { Phase4ReportView } from './components/Phase4ReportView';
import { Phase3ReportView } from './components/Phase3ReportView';
import { Phase2ReportView } from './components/Phase2ReportView';
import { Phase1ReportView } from './components/Phase1ReportView';
import { runPhase1VerificationSuite } from './domain/classSetEngine';
import { useAuth } from './context/AuthContext';
import { Database, ShieldCheck, KeyRound, Palette, Users, UserCheck, DollarSign, Building } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('digital-network');
  const testResults = runPhase1VerificationSuite();
  const { activeTenant } = useTenant();
  const { firebaseUser } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Header with Navigation and Test Status */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        passedTests={testResults.passCount}
        totalTests={testResults.testCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'digital-network' && <Phase17NetworkViewer />}
        {activeTab === 'digital-heritage' && <Phase16HeritageViewer />}
        {activeTab === 'projects-initiatives' && <Phase15ProjectsViewer currentUser={firebaseUser} />}
        {activeTab === 'confidential-welfare' && <Phase14WelfareViewer currentUser={firebaseUser} />}
        {activeTab === 'financial-management' && <WelfareFinanceViewer />}
        {activeTab === 'events-reunions' && <Phase12EventsViewer />}
        {activeTab === 'polls-voting' && <Phase11VotingViewer />}
        {activeTab === 'meetings-governance' && <Phase10MeetingsViewer />}
        {activeTab === 'communications' && <Phase9CommunicationsViewer />}
        {activeTab === 'member-directory' && <Phase8DirectoryViewer />}
        {activeTab === 'overview' && (
          <ExecutiveOverview onNavigateToTab={(tabId) => setActiveTab(tabId)} />
        )}
        {activeTab === 'database-live' && <Phase2DatabaseViewer />}
        {activeTab === 'auth-security' && <Phase3AuthViewer />}
        {activeTab === 'branding-config' && <Phase4BrandingViewer />}
        {activeTab === 'eligibility-engine' && <Phase5EligibilityViewer />}
        {activeTab === 'registration-verification' && <Phase6RegistrationVerificationViewer />}
        {activeTab === 'governance-management' && <Phase7GovernanceViewer />}
        {activeTab === 'domain' && <DomainModelViewer />}
        {activeTab === 'simulator' && <ClassSetSimulator />}
        {activeTab === 'security' && <SecurityGovernanceViewer />}
        {activeTab === 'governance' && <SecurityGovernanceViewer />}
        {activeTab === 'welfare-finance' && <WelfareFinanceViewer />}
        {activeTab === 'adrs' && <AdrViewer />}
        {activeTab === 'roadmap' && <RoadmapViewer />}
        {activeTab === 'report-phase17' && <Phase17ReportView />}
        {activeTab === 'report-phase16' && <Phase16ReportView />}
        {activeTab === 'report-phase15' && <Phase15ReportView />}
        {activeTab === 'report-phase14' && <Phase14ReportView />}
        {activeTab === 'report-phase13' && <Phase13ReportView />}
        {activeTab === 'report-phase12' && <Phase12ReportView />}
        {activeTab === 'report-phase11' && <Phase11ReportView />}
        {activeTab === 'report-phase10' && <Phase10ReportView />}
        {activeTab === 'report-phase9' && <Phase9ReportView />}
        {activeTab === 'report-phase8' && <Phase8ReportView />}
        {activeTab === 'report-phase7' && <Phase7ReportView />}
        {activeTab === 'report-phase6' && <Phase6ReportView />}
        {activeTab === 'report-phase5' && <Phase5ReportView />}
        {activeTab === 'report-phase4' && <Phase4ReportView />}
        {activeTab === 'report-phase3' && <Phase3ReportView />}
        {activeTab === 'report-phase2' && <Phase2ReportView />}
        {activeTab === 'report-phase1' && <Phase1ReportView />}
      </main>

      {/* Global Phase Gate Footer */}
      <footer className="bg-slate-900/90 border-t border-slate-800 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              <strong>{activeTenant?.schoolName || 'Abeokuta Grammar School'}</strong> (
              {activeTenant?.associationAcronym || 'AGSOBA'}) • {activeTenant?.country || 'Nigeria'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
            <span className="flex items-center gap-1 text-blue-400">
              <Building className="w-3.5 h-3.5" /> Phase 15 Capital Projects Active
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Budget Lock &amp; Ledger Reconciled
            </span>
            <span>•</span>
            <span className="text-slate-400">Awaiting Phase 16 Authorization</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <AppContent />
      </TenantProvider>
    </AuthProvider>
  );
}

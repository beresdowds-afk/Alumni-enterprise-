import React, { useState } from 'react';
import { DollarSign, HeartHandshake, ShieldCheck, ArrowRightLeft, FileSpreadsheet, Lock, AlertCircle } from 'lucide-react';

export const WelfareFinanceViewer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'finance' | 'welfare'>('finance');

  return (
    <div className="space-y-6">
      {/* Top Selector Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              Financial Integrity & Confidential Welfare Subsystems
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Architectural Specifications for Sections 7 & 14 of Master Implementation Directive
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSubTab('finance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                activeSubTab === 'finance'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Section 7: Financial Integrity
            </button>
            <button
              onClick={() => setActiveSubTab('welfare')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                activeSubTab === 'welfare'
                  ? 'bg-red-500/20 text-red-300 border-red-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <HeartHandshake className="w-4 h-4" /> Section 14: Confidential Welfare
            </button>
          </div>
        </div>

        {activeSubTab === 'finance' ? (
          <div className="space-y-6">
            {/* Non-Negotiable Financial Principles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-amber-400 font-mono font-bold text-[10px] uppercase">Principle 7.1</span>
                <h4 className="font-bold text-white">Separate Concepts for Money</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  The system maintains distinct tables and states for <strong>Dues Obligations</strong>, <strong>Initiated Payments</strong>, <strong>Verified Receipts</strong>, <strong>Pledges</strong>, and <strong>Expenses</strong>.
                  A pledge is NEVER recorded as cash received.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-emerald-400 font-mono font-bold text-[10px] uppercase">Principle 7.2</span>
                <h4 className="font-bold text-white">Immutable Double-Entry Ledger</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Financial entries cannot be updated (<code className="text-red-400">UPDATE</code>) or deleted (<code className="text-red-400">DELETE</code>).
                  Errors are rectified via explicit <strong>reversing adjustment entries</strong> with documented officer justifications.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-blue-400 font-mono font-bold text-[10px] uppercase">Principle 7.3</span>
                <h4 className="font-bold text-white">Server-Side Verification Only</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  The frontend client is never permitted to declare a payment successful.
                  Only cryptographically verified server-to-server gateway webhooks (Paystack/Flutterwave HMAC SHA512) credit accounts.
                </p>
              </div>
            </div>

            {/* Financial State Machine Diagram */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                Auditable Financial State Machine & Idempotency Pipeline
              </h3>
              <div className="bg-slate-900 p-4 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto">
                <pre className="leading-relaxed">
{`1. Dues Assessment -> Creates Obligation (due_obligations: status = UNPAID)
2. Member Checkout -> Generates Idempotent Ref (e.g. AGSOBA-8388-DUES-2026-98F4A1)
3. Client Gateway   -> Initiates Payment on Paystack/Flutterwave modal
4. Server Webhook  -> Signs HMAC verification -> Confirms Settlement directly with Gateway API
5. Double-Entry     -> DEBIT: Bank Account / Cash In Transit | CREDIT: Class Set Dues Revenue
6. Receipt Issuance-> Immutable cryptographically stamped PDF receipt with QR provenance code
7. Overwrite Guard -> Database trigger rejects any UPDATE on posted ledger lines!`}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Confidential Welfare Vault Overview */}
            <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
                <Lock className="w-4 h-4 text-red-400" />
                Air-Gapped Welfare Case Protection & Zero-Trust Boundary (Section 14)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Alumni in distress, medical crisis, or bereavement entrust their most vulnerable records to the association.
                Under our Phase 1 Architecture, welfare cases are physically and logically segregated from standard member directories, general communications, and platform engineering operations.
              </p>
            </div>

            {/* Welfare Architecture Specs */}
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

            {/* Welfare Disbursement Linking to Financial Ledger */}
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
        )}
      </div>
    </div>
  );
};

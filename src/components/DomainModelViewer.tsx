import React, { useState } from 'react';
import { Database, Layers, GitBranch, Key, Shield, Code, Table } from 'lucide-react';

export const DomainModelViewer: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<string>('class_sets');

  const entities = [
    {
      id: 'tenants',
      name: 'tenants (School / Root Tenant)',
      description: 'The root multi-tenant boundary representing Abeokuta Grammar School and future client institutions.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Immutable tenant identifier (e.g., tenant_agsoba_abeokuta)' },
        { name: 'name', type: 'VARCHAR(255)', desc: 'Official school name (e.g. Abeokuta Grammar School)' },
        { name: 'code', type: 'VARCHAR(50) UNIQUE', desc: 'URL slug and tenant code' },
        { name: 'country', type: 'VARCHAR(100)', desc: 'Nigeria' },
        { name: 'default_currency', type: 'VARCHAR(10)', desc: 'NGN' },
        { name: 'default_timezone', type: 'VARCHAR(100)', desc: 'Africa/Lagos' },
        { name: 'branding_config', type: 'JSONB', desc: 'Colors, crest URLs, typography, brand assets' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Creation timestamp' },
      ],
      constraints: ['PRIMARY KEY (id)', 'UNIQUE (code)'],
    },
    {
      id: 'associations',
      name: 'associations (Alumni Association)',
      description: 'The alumni body entity bound to a school tenant. Supports federated associations.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Unique association identifier' },
        { name: 'tenant_id', type: 'UUID REFERENCES tenants(id)', desc: 'Foreign key to parent school tenant' },
        { name: 'name', type: 'VARCHAR(255)', desc: 'Abeokuta Grammar School Old Boys Association' },
        { name: 'acronym', type: 'VARCHAR(50)', desc: 'AGSOBA' },
        { name: 'class_set_formula', type: 'VARCHAR(100)', desc: 'Formula rule: {acronym} {yy_adm}{zz_grad}' },
        { name: 'constitution_version', type: 'VARCHAR(50)', desc: 'Current active constitutional charter' },
        { name: 'status', type: 'VARCHAR(50)', desc: 'ACTIVE / SUSPENDED' },
      ],
      constraints: ['FOREIGN KEY (tenant_id) REFERENCES tenants(id)', 'UNIQUE (tenant_id, acronym)'],
    },
    {
      id: 'class_sets',
      name: 'class_sets (Canonical Class Set)',
      description: 'Core cohort entity defined by combination of admission year and graduation year.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Unique class set primary key' },
        { name: 'tenant_id', type: 'UUID REFERENCES tenants(id)', desc: 'Mandatory tenant isolation key' },
        { name: 'association_id', type: 'UUID REFERENCES associations(id)', desc: 'Parent alumni association' },
        { name: 'admission_year', type: 'INTEGER NOT NULL', desc: 'Full 4-digit admission year (e.g. 1983)' },
        { name: 'graduation_year', type: 'INTEGER NOT NULL', desc: 'Full 4-digit graduation year (e.g. 1988)' },
        { name: 'official_identifier', type: 'VARCHAR(50) NOT NULL', desc: 'Calculated short label: AGSOBA 8388' },
        { name: 'display_name', type: 'VARCHAR(255) NOT NULL', desc: 'Collision-disambiguated title' },
        { name: 'eligibility_policy_id', type: 'UUID', desc: 'Reference to approved membership rules' },
        { name: 'status', type: 'VARCHAR(50)', desc: 'CHARTERED / PROVISIONAL / DORMANT' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Creation timestamp' },
      ],
      constraints: [
        'FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
        'FOREIGN KEY (association_id) REFERENCES associations(id)',
        'CHECK (admission_year <= graduation_year)',
        'UNIQUE (tenant_id, association_id, admission_year, graduation_year) -- Guarantees century collision prevention',
      ],
    },
    {
      id: 'identities',
      name: 'identities & profiles (Canonical Person)',
      description: 'One single physical human record per person across all memberships, roles, and attendance history.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Universal platform identity' },
        { name: 'email', type: 'VARCHAR(255) UNIQUE', desc: 'Primary verified email' },
        { name: 'phone_number', type: 'VARCHAR(50)', desc: 'E.164 verified phone number' },
        { name: 'first_name', type: 'VARCHAR(100)', desc: 'Legal first name' },
        { name: 'last_name', type: 'VARCHAR(100)', desc: 'Legal surname' },
        { name: 'middle_name', type: 'VARCHAR(100)', desc: 'Middle name / alias' },
        { name: 'is_email_verified', type: 'BOOLEAN', desc: 'Verification status' },
        { name: 'mfa_enabled', type: 'BOOLEAN', desc: 'Multi-factor authentication status' },
      ],
      constraints: ['PRIMARY KEY (id)', 'UNIQUE (email)'],
    },
    {
      id: 'school_attendances',
      name: 'school_attendances (Factual Historical Attendance)',
      description: 'Immutable factual record of school attendance. Never fabricated or mutated for class set affiliation.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Attendance record ID' },
        { name: 'identity_id', type: 'UUID REFERENCES identities(id)', desc: 'Alumnus identity' },
        { name: 'tenant_id', type: 'UUID REFERENCES tenants(id)', desc: 'School attended' },
        { name: 'actual_admission_year', type: 'INTEGER NOT NULL', desc: 'True year entered school (e.g. 1983, or 1986 for transfer)' },
        { name: 'actual_exit_year', type: 'INTEGER NOT NULL', desc: 'True year departed school (e.g. 1985 for midway leaver, 1988 for grad)' },
        { name: 'entry_class', type: 'VARCHAR(50)', desc: 'Form 1, JSS 1, Form 4' },
        { name: 'exit_class', type: 'VARCHAR(50)', desc: 'Form 3, Form 5, SSS 3' },
        { name: 'graduated_from_school', type: 'BOOLEAN NOT NULL', desc: 'True if completed graduation at school' },
        { name: 'reason_for_leaving', type: 'TEXT', desc: 'Relocation, completion, transfer' },
      ],
      constraints: [
        'FOREIGN KEY (identity_id) REFERENCES identities(id)',
        'FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
        'CHECK (actual_admission_year <= actual_exit_year)',
      ],
    },
    {
      id: 'class_set_memberships',
      name: 'class_set_memberships (Association Recognition)',
      description: 'Associates an identity with a class set under an approved constitutional membership category.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Membership relationship key' },
        { name: 'identity_id', type: 'UUID REFERENCES identities(id)', desc: 'Alumnus identity' },
        { name: 'class_set_id', type: 'UUID REFERENCES class_sets(id)', desc: 'Target class set (e.g. AGSOBA 8388)' },
        { name: 'category', type: 'VARCHAR(100) NOT NULL', desc: 'STANDARD_COHORT, MIDWAY_LEAVER_RECOGNISED, TRANSFER_ENTRANT' },
        { name: 'basis_of_recognition', type: 'TEXT', desc: 'Constitutional article / historical evidence basis' },
        { name: 'verification_status', type: 'VARCHAR(50)', desc: 'VERIFIED / PENDING_REVIEW / REJECTED / DISPUTED' },
        { name: 'verified_by_identity_id', type: 'UUID REFERENCES identities(id)', desc: 'Authorised officer who verified' },
        { name: 'verified_at', type: 'TIMESTAMPTZ', desc: 'Verification timestamp' },
      ],
      constraints: [
        'FOREIGN KEY (class_set_id) REFERENCES class_sets(id)',
        'UNIQUE (identity_id, class_set_id)',
      ],
    },
    {
      id: 'financial_journals',
      name: 'financial_journals & transactions (Double-Entry Ledger)',
      description: 'Immutable append-only ledger for dues, pledges, donations, and expense disbursements.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Ledger journal entry ID' },
        { name: 'tenant_id', type: 'UUID REFERENCES tenants(id)', desc: 'Tenant isolation key' },
        { name: 'class_set_id', type: 'UUID REFERENCES class_sets(id)', desc: 'Class set sub-ledger' },
        { name: 'transaction_reference', type: 'VARCHAR(100) UNIQUE', desc: 'Idempotency and bank transaction reference' },
        { name: 'account_type', type: 'VARCHAR(50)', desc: 'DUES, REUNION, WELFARE_FUND, CAPITAL_PROJECT' },
        { name: 'entry_type', type: 'VARCHAR(10)', desc: 'DEBIT or CREDIT' },
        { name: 'amount', type: 'DECIMAL(18, 2) NOT NULL', desc: 'Transaction amount in NGN' },
        { name: 'gateway_status', type: 'VARCHAR(50)', desc: 'VERIFIED_SUCCESSFUL / PENDING_GATEWAY / FAILED' },
        { name: 'posted_by_officer_id', type: 'UUID REFERENCES identities(id)', desc: 'Treasurer or system webhook' },
        { name: 'posted_at', type: 'TIMESTAMPTZ NOT NULL', desc: 'Immutable post timestamp' },
      ],
      constraints: [
        'PRIMARY KEY (id)',
        'UNIQUE (transaction_reference)',
        'CHECK (amount > 0)',
        'Trigger PREVENT_UPDATE_OR_DELETE_FINANCIAL_RECORD',
      ],
    },
    {
      id: 'welfare_cases',
      name: 'welfare_cases (Confidential Air-Gapped Vault)',
      description: 'Strictly restricted welfare relief requests, medical grant cases, and bereavement assistance.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Case file ID' },
        { name: 'tenant_id', type: 'UUID REFERENCES tenants(id)', desc: 'Tenant boundary' },
        { name: 'class_set_id', type: 'UUID REFERENCES class_sets(id)', desc: 'Class set welfare domain' },
        { name: 'applicant_identity_id', type: 'UUID REFERENCES identities(id)', desc: 'Distressed member / beneficiary' },
        { name: 'case_category', type: 'VARCHAR(100)', desc: 'MEDICAL_EMERGENCY, BEREAVEMENT, INDIGENT_AID' },
        { name: 'encrypted_case_details', type: 'BYTEA NOT NULL', desc: 'AES-256 encrypted medical and personal diagnosis notes' },
        { name: 'approved_amount', type: 'DECIMAL(18, 2)', desc: 'Approved welfare disbursement' },
        { name: 'case_status', type: 'VARCHAR(50)', desc: 'INTAKE / COMMITTEE_REVIEW / APPROVED / DISBURSED / CLOSED' },
        { name: 'read_audit_required', type: 'BOOLEAN DEFAULT TRUE', desc: 'Triggers audit entry on every read attempt' },
      ],
      constraints: [
        'PRIMARY KEY (id)',
        'FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
        'RLS Policy: ONLY Welfare Committee Officers and Case Assigned Trustees may SELECT/INSERT',
      ],
    },
  ];

  const current = entities.find((e) => e.id === selectedEntity) || entities[2];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Domain Model & Relational Schema Architecture</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Multi-tenant entity hierarchy, zero-falsification attendance separation, and double-entry financial ledger
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full font-mono">
              Prepared for Phase 2 Relational Rollout
            </span>
          </div>
        </div>

        {/* Visual Domain Hierarchy Chart */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 font-mono text-xs overflow-x-auto">
          <div className="text-amber-400 font-bold mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Relational Hierarchy Diagram
          </div>
          <pre className="text-slate-300 text-[11px] leading-relaxed">
{`Platform (Global Infrastructure & Provisioning Scope)
 └── tenants (Abeokuta Grammar School, ID: sch_ags_01) [Discriminator: tenant_id]
       └── associations (AGSOBA, ID: asc_agsoba_01) [Unique: tenant_id + acronym]
             └── class_sets (e.g., AGSOBA 8388, Adm: 1983, Grad: 1988) [Unique: assoc_id + adm + grad]
                   ├── school_attendances (Factual, Immutable Entrance/Exit Years)
                   ├── class_set_memberships (Category: Standard, Midway Leaver, Transfer)
                   ├── executive_appointments (Time-bound leadership: Chairman, Sec, Treas)
                   ├── meetings, agendas & resolutions (Constitutional records)
                   ├── financial_journals & ledger (Double-entry, append-only, NGN)
                   ├── welfare_cases (Air-gapped, encrypted, committee-access only)
                   ├── projects & milestones (Capital school development initiatives)
                   └── heritage_archives (Century-spanning photography & provenance)`}
          </pre>
        </div>

        {/* Entity Selector Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {entities.map((ent) => (
            <button
              key={ent.id}
              onClick={() => setSelectedEntity(ent.id)}
              className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition flex items-center gap-1.5 border ${
                selectedEntity === ent.id
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              {ent.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Selected Entity Schema Inspection Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                <Code className="w-4 h-4 text-emerald-400" />
                {current.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{current.description}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              {current.fields.length} Columns Defined
            </span>
          </div>

          {/* Fields Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2">Column Name</th>
                  <th className="px-3 py-2">SQL Data Type & Nullability</th>
                  <th className="px-3 py-2">Engineering Rationale & Business Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {current.fields.map((f, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="px-3 py-2 font-bold text-amber-300 flex items-center gap-1">
                      {f.name === 'id' ? <Key className="w-3 h-3 text-amber-400" /> : null}
                      {f.name}
                    </td>
                    <td className="px-3 py-2 text-emerald-400">{f.type}</td>
                    <td className="px-3 py-2 text-slate-400 font-sans">{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Constraints & Invariants */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" /> Integrity Constraints & Indexes
            </div>
            <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-1 font-mono">
              {current.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

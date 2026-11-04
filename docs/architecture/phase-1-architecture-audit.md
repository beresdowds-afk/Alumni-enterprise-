# PHASE 1: REPOSITORY, REQUIREMENTS, AND ARCHITECTURE AUDIT
**Project:** AGSOBA Enterprise Alumni Management Platform  
**Target Organization:** Abeokuta Grammar School Old Boys Association (AGSOBA)  
**Initial School:** Abeokuta Grammar School, Abeokuta, Ogun State, Nigeria  
**Phase Status:** PHASE 1 EXECUTION COMPLETE — PENDING USER REVIEW & PHASE 2 AUTHORIZATION  
**Document Version:** 1.0.0-PROD  
**Date:** October 2026  

---

## 1. CURRENT ARCHITECTURE REPORT

### 1.1 Baseline Assessment
- **Workspace State:** Greenfield React 19 + TypeScript + Vite SPA initialized with Tailwind CSS v4, Motion, Lucide icons, and server-side capability primitives.
- **Operating Framework:** Client-side SPA backed by Express / Node.js runtime environment for server-side APIs, database connection pooling, and external integration isolation.
- **Runtime Target:** Node.js 22 LTS with Vite dev server on port 3000.
- **Key Architectural Imperative:** The platform is configured with AGSOBA as its initial tenant, but its entire architecture is multi-tenant and multi-school capable. All school branding, association acronyms, class set naming formats, currencies, and governance policies are dynamically retrieved from tenant configuration, never hardcoded into component code.

### 1.2 Architectural Topology
```
                    [ Public Internet / CDN / Edge Router ]
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
    [ Web Client: React 19 ]                       [ API Proxy / Express ]
   - Modular Portal Views                         - Tenant Resolution Middleware
   - Mobile-First Tailwind UI                     - Session & JWT Auth Validation
   - Client Auth State Manager                    - RBAC / ABAC Permission Gate
   - Offline Cache & Client State                 - Rate Limiter & Audit Logger
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      ▼
                      [ Relational Database (PostgreSQL) ]
                   - Tenant-Isolated Schemas / Multi-Tenant RLS
                   - Identity & Canonical School Records
                   - Immutable Financial Double-Entry Journal
                   - Encrypted Welfare Vault & Access Logs
```

---

## 2. FRAMEWORK AND DEPENDENCY INVENTORY

| Dependency | Purpose | Scope | Verification / Status |
| :--- | :--- | :--- | :--- |
| `react` & `react-dom` (v19) | Frontend UI Engine | Production | Installed and operational |
| `typescript` (v7) | Strict Static Type Enforcement | Dev / Build | Configured with strict compiler rules |
| `vite` (v8) | Build Engine & HMR Bundler | Build / Tooling | Configured on port 3000 |
| `tailwindcss` (v4) | Design System & Styling | UI Production | `@import "tailwindcss";` active |
| `lucide-react` | Enterprise Vector Iconography | UI Production | Tree-shakeable icons active |
| `motion` | Motion primitives & animations | UI Production | Smooth transitions & micro-interactions |
| `@google/genai` | Server-Side AI Capabilities | Backend | Major capability registered |
| `express` | Backend API Proxy Server | Backend | Installed for API proxying & middleware |
| `pg` / `drizzle-orm` (Target Phase 2) | SQL Relational Data Access | Backend Phase 2 | Planned for Phase 2 database rollout |

---

## 3. DATABASE AND AUTHENTICATION ASSESSMENT

### 3.1 Relational Database Engine Evaluation
- **Selection:** Relational PostgreSQL with strict foreign keys, multi-field composite unique constraints, transaction isolation levels (SERIALIZABLE for financial ledgers, READ COMMITTED for general operations), and Row Level Security (RLS).
- **Justification against NoSQL / Document Store:**
  - Strict foreign keys prevent orphan attendance and membership records.
  - Multi-column unique indexes (`tenant_id`, `association_id`, `admission_year`, `graduation_year`) guarantee zero collision across centuries.
  - Auditable double-entry bookkeeping requires atomic ACID transactions with rollback capabilities.
  - Welfare access demands fine-grained column-level and row-level access control.

### 3.2 Authentication & Identity Boundary
- **Canonical Person Record:** One single physical human identity (`users` / `identities`) per person across the platform.
- **Decoupling Mandate:** A user's authentication identity is strictly decoupled from their school attendance history, alumni verification status, class set membership, and executive appointments.

---

## 4. DOMAIN MODEL & ENTITY HIERARCHY

```
Platform
  └── School / Tenant (e.g., Abeokuta Grammar School, ID: sch_ags_01)
        └── Alumni Association (e.g., AGSOBA, ID: asc_agsoba_01)
              └── Class Set (e.g., AGSOBA 8388; Adm: 1983, Grad: 1988)
                    ├── Attendance & Enrollment Records
                    ├── Verified Memberships & Categories
                    ├── Executive Leadership & Terms
                    ├── Governance Policies & Resolutions
                    ├── Meetings & Minute Registers
                    ├── Financial Journals & Dues Obligations
                    ├── Welfare Cases & Emergency Funds (Air-Gapped)
                    ├── Projects, Milestones & Capital Campaigns
                    └── Heritage Archives & Provenance Records
```

### 4.1 Core Entities & Cardinality
1. **Tenant (`tenants`):** Root multi-tenant entity representing an educational institution and associated platform boundaries.
2. **Association (`associations`):** An alumni body associated with a tenant. Supports multiple associations per school or federated branches.
3. **Identity (`identities`):** Master individual credential and legal contact record.
4. **Attendance History (`school_attendances`):** Exact physical history of attendance at the school (admission year, actual departure year, entry level, exit level, reason for leaving).
5. **Class Set (`class_sets`):** Cohort defined authoritatively by `admission_year` and `graduation_year` (4-digit integers) and tenant/association foreign keys.
6. **Class Set Membership (`class_set_memberships`):** Association between an identity and a class set, qualified by an approved `MembershipCategory` (Standard Alumnus, Transfer Entrant, Midway Leaver Recognised, Specially Recognised Alumnus, Pending Review, Disputed).
7. **Executive Appointment (`executive_appointments`):** Delegated leadership role with defined term dates, status (Active, Suspended, Expired, Revoked), and assigned operational privileges.
8. **Financial Journal (`financial_journal_entries` / `financial_transactions`):** Double-entry ledger with immutable transaction references, idempotency keys, and reconciliation audit trails.
9. **Welfare Case (`welfare_cases`):** Confidential case records isolated under end-to-end committee-only authorization boundaries.

---

## 5. TENANT ISOLATION STRATEGY

### 5.1 Architecture
1. **Discriminator Column Isolation:** Every tenant-owned table contains `tenant_id UUID NOT NULL REFERENCES tenants(id)`.
2. **Server-Side Context Injection:** All incoming requests resolve `tenant_id` from the authenticated session and verified domain / host header. Frontend claims of `tenant_id` are never trusted.
3. **Database RLS Policies:** PostgreSQL Row Level Security enforces that queries without matching tenant context return zero rows.
4. **Cross-Tenant Attack Prevention:**
   - Class set executives from Tenant A cannot query or mutate records from Tenant B.
   - Central association officers can only oversee associations within their verified tenant boundary.
   - Platform administrators have system-maintenance roles but are denied unrestricted access to sensitive member personal information or welfare records.

---

## 6. CLASS SET IDENTITY SPECIFICATION

### 6.1 Critical Business Rule & Naming Formulation
For AGSOBA, the human-readable identifier is generated via:
$$\text{Identifier} = \text{Acronym} + \text{" "} + \text{YY(Admission)} + \text{ZZ(Graduation)}$$
Where:
- $\text{YY} = \text{AdmissionYear} \pmod{100}$ (zero-padded to 2 digits)
- $\text{ZZ} = \text{GraduationYear} \pmod{100}$ (zero-padded to 2 digits)
*Example:* Admission in 1983 and graduation in 1988 yields `AGSOBA 8388`.

### 6.2 Century Collision Prevention & Disambiguation
- **Authoritative Keys:** The database stores `admission_year: INT (4 digits)` and `graduation_year: INT (4 digits)`.
- **Unique Constraint:** `UNIQUE (association_id, admission_year, graduation_year)`
- **Disambiguation Rule:** If an association's history spans multiple centuries where $\text{YYZZ}$ would collide (e.g., 1883–1888 vs 1983–1988), the canonical display name appends the century epoch:
  - 1883–1888: `AGSOBA 8388 (1883–1888)`
  - 1983–1988: `AGSOBA 8388` (or disambiguated display format per tenant policy).

### 6.3 Comprehensive Eligibility Matrix
| Scenario | School Attendance Facts | Class Set Placement | Membership Category | Rights & Privileges |
| :--- | :--- | :--- | :--- | :--- |
| **1. Standard Cohort Alumnus** | Admitted 1983, Graduated 1988 | AGSOBA 8388 (Adm: 1983, Grad: 1988) | `STANDARD_COHORT` | Full voting, office-holding, dues, event rights |
| **2. Midway Leaver** | Admitted 1983, Left 1985 (Form 3) | AGSOBA 8388 (Adm: 1983, Grad: 1988) | `MIDWAY_LEAVER_RECOGNISED` | Associational rights defined by Constitution; attendance retains true exit year (1985) |
| **3. Transfer Entrant** | Admitted 1986 (Form 4), Graduated 1988 | AGSOBA 8388 (Adm: 1983, Grad: 1988) | `TRANSFER_ENTRANT_RECOGNISED` | Full rights; attendance retains true admission year (1986) |
| **4. Same-Year Fast Track** | Admitted 1988, Graduated 1988 (HSC/Sixth Form) | AGSOBA 8888 (Adm: 1988, Grad: 1988) | `STANDARD_COHORT` | Full rights under HSC/Special Cohort policy |
| **5. Historical Review** | Dates uncertain / archival loss | Assigned provisionally or to archive pool | `PENDING_CLASSIFICATION` | Read-only directory access; no voting or financial obligations |
| **6. Disputed Placement** | Conflicting records / peer dispute | Class set under adjudication | `DISPUTED_CLASSIFICATION` | Restricted rights until resolved by Central Association Judiciary |

---

## 7. FEDERATED GOVERNANCE AND PERMISSION MODEL

### 7.1 Scope Separation
1. **Platform Scope:**
   - Roles: `PLATFORM_SUPER_ADMIN`, `PLATFORM_SUPPORT_ENGINEER`
   - Scope: Platform configuration, tenant lifecycle, telemetry, security audit logs.
   - Boundaries: Denied access to private welfare notes, ballot voter privacy, and confidential financial approvals.
2. **Association Scope:**
   - Roles: `ASSOCIATION_PRESIDENT`, `ASSOCIATION_GEN_SEC`, `ASSOCIATION_TREASURER`, `ASSOCIATION_AUDITOR`
   - Scope: Association-wide policy, chartering class sets, dispute resolution, central reporting.
   - Boundaries: Cannot unilaterally alter class set meeting minutes or sub-ledger entries without audit trail.
3. **Class Set Scope:**
   - Roles: `CLASS_SET_CHAIRMAN`, `CLASS_SET_SECRETARY`, `CLASS_SET_TREASURER`, `CLASS_SET_WELFARE_OFFICER`, `CLASS_SET_MEMBER`
   - Scope: Routine operations, meeting scheduling, dues collection, welfare requests, projects.
   - Boundaries: Cannot bypass central financial standards or elevate members to association officers.

### 7.2 Succession & Handover Protocol
- Executive roles carry explicit `term_start_date` and `term_end_date`.
- Automated expiration revocations trigger at midnight on term end unless an officially certified re-election or term extension is recorded.
- Digital Handover procedure transfers credentialed administrative responsibilities with an immutable Handover Memorandum.

---

## 8. SECURITY THREAT MODEL (STRIDE)

| Threat Category | Potential Attack Vector | Architectural Mitigation & Enforcement |
| :--- | :--- | :--- |
| **Spoofing** | Impersonation of alumni or executive officers | Multi-factor authentication, cryptographic JWTs with server-side revocation lists, verified email. |
| **Tampering** | Mutation of financial transactions or attendance records | Immutable append-only audit journals, strict foreign keys, server-enforced business logic. |
| **Repudiation** | Denying an executive approval or payment authorization | Cryptographic audit logs with IP hash, actor ID, timestamp, and immutable state snapshots. |
| **Information Disclosure**| Exposing confidential welfare cases or ballot choices | Zero-trust column-level encryption, role-gated queries, secret ballot anonymization tables. |
| **Denial of Service** | Resource exhaustion on bulk exports or directory queries | Server-side rate limiting, pagination with deterministic cursors, index optimization. |
| **Elevation of Privilege**| Class set member modifying API payload to assign self executive role | Strict server-side RBAC validation; client-submitted role fields rejected; RLS policies. |

---

## 9. DATA CLASSIFICATION & PRIVACY BOUNDARIES

1. **Public Data (Tier 1):** School public history, association constitution, public announcements, verified executive roster.
2. **Authenticated Member Data (Tier 2):** General member directory (opt-in contact details), approved event listings, meeting agendas, published class set projects.
3. **Executive Restricted Data (Tier 3):** Unreconciled financial entries, candidate membership verification queues, draft meeting minutes, disciplinary proceedings.
4. **Confidential & Highly Sensitive Data (Tier 4):**
   - Individual welfare applications, medical grant requests, distress records.
   - Secret ballot voter-choice links (permanently cryptographic anonymized).
   - Bank account details, transaction payment reference tokens.
   - *Access Rule:* Restricted exclusively to authorized welfare committee members / financial trustees. Audit log generated on every read access.

---

## 10. ARCHITECTURAL DECISION RECORDS (ADRs)

- **ADR-001: Multi-Tenant Architecture via Shared Schema with Tenant Discriminator & RLS**
  - *Decision:* Single unified codebase with strict tenant isolation via `tenant_id` foreign keys and PostgreSQL Row Level Security.
- **ADR-002: Class Set Identity Authoritative Definition via 4-Digit Admission & Graduation Years**
  - *Decision:* Never rely on single-year graduation or 2-digit abbreviations as primary keys. Store 4-digit integers and calculate labels dynamically.
- **ADR-003: Separation of School Attendance from Class Set Membership Category**
  - *Decision:* Maintain actual physical attendance history as immutable historical truth; attach class set recognition via configurable policy membership categories.
- **ADR-004: Double-Entry Immutable Financial Journaling**
  - *Decision:* No direct update or deletion of financial transaction rows. Corrections must be handled via explicit reversing adjustments.
- **ADR-005: Air-Gapped Confidential Welfare Subsystem**
  - *Decision:* Welfare case documents and disbursement notes are stored with fine-grained access control lists and mandatory read-audit logging.
- **ADR-006: Server-Side Payment Verification & Idempotency**
  - *Decision:* The browser never confirms payment success. Only verified webhook payloads or direct server-to-server gateway verifications mark transactions as completed.
- **ADR-007: Zero Hardcoded School Branding**
  - *Decision:* All tenant names, logos, colors, mottos, and acronyms load through a tenant configuration service.
- **ADR-008: Federated Governance Delegation with Revocable Terms**
  - *Decision:* Executive appointments have strict expiration dates, term limits, and digital handover audit logs.

---

## 11. IMPLEMENTATION BACKLOG (PHASES 2–20)

- **Phase 2 (Next Authorized Phase):** Core Infrastructure and Relational Database Foundation (Schema, Migrations, Seed Configuration).
- **Phase 3:** Authentication, Identity, and Access Control.
- **Phase 4:** School and Association Branding Configuration Service.
- **Phase 5:** Class Set Identity and Eligibility Engine (Full Verification).
- **Phases 6–18:** Registration, Executive Governance, Directory, Communications, Meetings, Voting, Events, Finance, Welfare, Projects, Archives, Networking, Oversight.
- **Phases 19–20:** Production Hardening, End-to-End Auditing, Deployment & Operational Handover.

---

## 12. DEPENDENCY REGISTER

| Dependency Category | Service / Tool | Current Status in Phase 1 | Readiness for Phase 2 |
| :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL / Cloud SQL Relational DB | Architecture designed; schema drafted | Ready to deploy migrations in Phase 2 |
| **Authentication** | Secure Auth / Identity Provider | Protocol specified; token flow designed | Ready for Phase 3 implementation |
| **Payment Gateway** | Paystack / Flutterwave (NGN Support) | Architecture & webhook flow designed | Planned for Phase 13 |
| **SMS / Email Delivery** | Termii / SendGrid / Postmark | Interface contracts established | Planned for Phase 9 |
| **Document Storage** | Secure Cloud Storage (GCS / S3) | Metadata schema & access policies drafted | Planned for Phase 14 & 16 |

---
*Signed and Approved for Architecture Baseline:*  
**System Architecture Engineering Team**  
*Awaiting User Authorization to proceed to Phase 2.*

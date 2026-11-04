export interface AdrItem {
  id: string;
  title: string;
  status: 'ACCEPTED' | 'PROPOSED' | 'DEPRECATED';
  context: string;
  decision: string;
  consequences: string;
}

export interface ThreatModelItem {
  category: 'Spoofing' | 'Tampering' | 'Repudiation' | 'Information Disclosure' | 'Denial of Service' | 'Elevation of Privilege';
  asset: string;
  threat: string;
  mitigation: string;
  enforcementTier: 'DATABASE_RLS' | 'SERVER_MIDDLEWARE' | 'CRYPTO_ENCLAVE' | 'AUDIT_LOG';
}

export interface PhaseRoadmapItem {
  phase: number;
  title: string;
  objective: string;
  status: 'COMPLETED' | 'READY_FOR_AUTHORIZATION' | 'BLOCKED_BY_DEPENDENCY' | 'PENDING_PRIOR_PHASE';
  keyDeliverables: string[];
  acceptanceCriteria: string;
}

export const ADR_LIST: AdrItem[] = [
  {
    id: 'ADR-001',
    title: 'Shared Schema Multi-Tenancy with Row-Level Security',
    status: 'ACCEPTED',
    context:
      'The platform must support multiple schools and their distinct alumni associations while starting with Abeokuta Grammar School (AGSOBA). Separate database instances per tenant would incur significant operational overhead and cold-start latency.',
    decision:
      'Adopt a shared relational schema partitioned logically via compulsory tenant_id discriminator columns and enforced through PostgreSQL Row Level Security (RLS) policies and server-side tenant resolution middleware.',
    consequences:
      'High cost-efficiency, seamless scalability to hundreds of schools, zero cross-tenant data leakage, strict requirement that all database queries and foreign keys include tenant_id context.',
  },
  {
    id: 'ADR-002',
    title: 'Authoritative 4-Digit Full-Year Representation for Class Sets',
    status: 'ACCEPTED',
    context:
      'Abeokuta Grammar School was founded in 1908. A 2-digit format such as "8388" creates century ambiguities (e.g. 1883–1888 vs 1983–1988) and cannot serve as a solitary database key.',
    decision:
      'Store full four-digit integers for admission_year and graduation_year. Enforce composite unique constraint (association_id, admission_year, graduation_year). The human-readable string (e.g. AGSOBA 8388) is computed dynamically and disambiguated with the full-year span when century collisions are detected.',
    consequences:
      'Absolute historical accuracy, zero collision over multiple centuries, immutable primary indexing.',
  },
  {
    id: 'ADR-003',
    title: 'Separation of School Attendance Truth from Association Recognition',
    status: 'ACCEPTED',
    context:
      'Students leave early (e.g., after Form 3 in 1985) or transfer in late (e.g., Form 4 in 1986). Fabricating graduation or admission years to force them into a class set corrupts institutional history.',
    decision:
      'Model physical school attendance (actual admission year, actual exit year, forms completed, graduation status) as immutable historical fact. Model class set affiliation separately with a configurable MembershipCategory (e.g., MIDWAY_LEAVER_RECOGNISED, TRANSFER_ENTRANT_RECOGNISED) and constitutional basis of recognition.',
    consequences:
      'Zero historical falsification. The school archive maintains pristine records while the alumni association honors bonds of fellowship.',
  },
  {
    id: 'ADR-004',
    title: 'Immutable Double-Entry Ledger for Financial Integrity',
    status: 'ACCEPTED',
    context:
      'Alumni associations manage millions of Naira across dues, capital projects, reunions, and welfare. Unchecked client balance updates or in-place record deletions represent severe fraud vulnerabilities.',
    decision:
      'Implement an append-only double-entry financial journal. Prohibit UPDATE and DELETE on posted financial transactions. Corrections must be handled through explicit reversing credit/debit entries with mandatory audit justifications.',
    consequences:
      'Tamper-evident financial audit trails, seamless annual auditor reconciliations, zero silent ledger overwrites.',
  },
  {
    id: 'ADR-005',
    title: 'Zero-Trust Confidential Welfare Case Vault',
    status: 'ACCEPTED',
    context:
      'Alumni welfare involves sensitive distress requests, bereavement grants, medical records, and indigent support. Exposing these to general members or even platform technical admins violates privacy laws and member trust.',
    decision:
      'Isolate welfare records in an air-gapped domain model with column-level encryption and strict role-based access control. Restrict access exclusively to certified Welfare Committee officers with mandatory immutable access logging on every read event.',
    consequences:
      'Absolute dignity and privacy for distressed members, NDPR and global data protection compliance.',
  },
  {
    id: 'ADR-006',
    title: 'Server-Side Payment Verification & Idempotency Key Enclave',
    status: 'ACCEPTED',
    context:
      'Client-reported payment confirmations can be manipulated by malicious network requests or replay attacks.',
    decision:
      'No financial payment is confirmed by client notification. Transactions are only marked successful upon receipt of cryptographic webhooks from licensed payment gateways (Paystack/Flutterwave) verified by server-side HMAC signatures, with UUIDv4 idempotency keys.',
    consequences:
      'Impenetrable payment confirmation flow, zero duplicate charges, elimination of fake payment spoofing.',
  },
  {
    id: 'ADR-007',
    title: 'Dynamic Tenant Brand Configuration via Relational Store',
    status: 'ACCEPTED',
    context:
      'Hardcoding school names, colors, or acronyms prevents the platform from serving other schools without code rewrites.',
    decision:
      'Store all tenant identity parameters (school name, acronym, crest URL, primary/secondary brand palette, default currency, timezone, identifier formula) in a validated tenant_configurations table accessible via a cached server-side configuration service.',
    consequences:
      'Multi-school white-label capability from day one; changes to brand identity require no code deployments.',
  },
  {
    id: 'ADR-008',
    title: 'Federated Governance with Time-Bound Executive Mandates',
    status: 'ACCEPTED',
    context:
      'Class set leadership rotates via periodic elections or constitutional appointments. Stale or zombie executive privileges pose major security risks.',
    decision:
      'Executive privileges are tied to time-bound executive_appointments with explicit term_start and term_end timestamps. Privileges auto-expire at midnight on term expiration unless extended by official resolution or digital handover.',
    consequences:
      'Zero orphaned administrative access, verifiable chain of leadership succession, transparent governance.',
  },
];

export const THREAT_MODEL: ThreatModelItem[] = [
  {
    category: 'Spoofing',
    asset: 'Executive Officer Session',
    threat: 'Attacker forges credentials to impersonate Class Set Treasurer or General Secretary.',
    mitigation: 'Multi-factor authentication (MFA/TOTP), HttpOnly Secure SameSite JWTs with server-side revocation list.',
    enforcementTier: 'SERVER_MIDDLEWARE',
  },
  {
    category: 'Tampering',
    asset: 'Financial Ledger & Bank Reference',
    threat: 'Malicious client attempts to modify dues payment amount or mark unpaid dues as settled.',
    mitigation: 'Append-only ledger with database-level trigger denying UPDATE/DELETE; server-side payment gateway webhook verification.',
    enforcementTier: 'DATABASE_RLS',
  },
  {
    category: 'Repudiation',
    asset: 'Constitutional Resolutions & Votes',
    threat: 'An executive officer denies having authorized a welfare disbursement or election tally.',
    mitigation: 'Cryptographic audit log recording actor identity, tenant context, timestamp, client IP hash, and state diff.',
    enforcementTier: 'AUDIT_LOG',
  },
  {
    category: 'Information Disclosure',
    asset: 'Confidential Welfare Health Records',
    threat: 'Ordinary member queries API endpoints to view a classmate’s confidential emergency medical assistance application.',
    mitigation: 'Fine-grained ABAC/RBAC checks in API resolver; welfare records excluded from general query resolvers; column-level encryption.',
    enforcementTier: 'CRYPTO_ENCLAVE',
  },
  {
    category: 'Denial of Service',
    asset: 'Alumni Directory Search API',
    threat: 'Bot scrapes entire global directory with high-frequency unindexed wildcard queries.',
    mitigation: 'Leaky-bucket rate limiting per IP and user ID, cursor-based pagination, indexed full-text search.',
    enforcementTier: 'SERVER_MIDDLEWARE',
  },
  {
    category: 'Elevation of Privilege',
    asset: 'Role Assignment Endpoint',
    threat: 'Standard cohort member submits crafted JSON body containing role="CLASS_SET_CHAIRMAN".',
    mitigation: 'Strict input schema filtering (Zod/Pydantic style) discarding privileged fields; server-authoritative role verification.',
    enforcementTier: 'SERVER_MIDDLEWARE',
  },
];

export const PHASES_MASTER_ROADMAP: PhaseRoadmapItem[] = [
  {
    phase: 1,
    title: 'Repository, Requirements, and Architecture Audit',
    objective: 'Establish multi-tenant baseline, domain model, class set identity formula, and security architecture.',
    status: 'COMPLETED',
    keyDeliverables: [
      'Architecture report & topology',
      'Dependency & framework inventory',
      'Class set identity specification (AGSOBA YYZZ & century collision check)',
      'STRIDE security threat model & data classification',
      'ADRs 001 through 008',
      'Automated verification test suite for domain rules',
    ],
    acceptanceCriteria:
      'Architecture explicitly supports configurable schools, associations, admission/graduation class sets, federated governance, financial integrity, and private welfare records.',
  },
  {
    phase: 2,
    title: 'Core Infrastructure and Database Foundation',
    objective: 'Implement PostgreSQL database schema, migrations, configuration management, and baseline models.',
    status: 'COMPLETED',
    keyDeliverables: [
      'Relational PostgreSQL schema with tenant isolation and RLS on Cloud SQL (Developer Edition)',
      'Composite unique constraints on admission_year and graduation_year',
      'Migration tracking in schema_migrations (Batch 1 applied)',
      'Seeded Abeokuta Grammar School (AGSOBA) tenant and 7 canonical permissions',
    ],
    acceptanceCriteria:
      'Schema supports the required relationships, constraints, tenant ownership, and class set year combinations. Migrations apply cleanly.',
  },
  {
    phase: 3,
    title: 'Authentication, Identity, and Access Control',
    objective: 'Implement session handling, account recovery, profile management, and 3-tier scope enforcement.',
    status: 'COMPLETED',
    keyDeliverables: [
      'Firebase Authentication integration (Google OAuth)',
      'PostgreSQL canonical identity & profile sync',
      'Platform, Association, and Class Set scope enforcement guards',
      'Administrative and security audit event logging in audit_logs',
    ],
    acceptanceCriteria: 'Unauthorised operations fail on the server. Tenant isolation and privilege boundaries pass automated tests.',
  },
  {
    phase: 4,
    title: 'School and Association Branding Configuration',
    objective: 'Implement dynamic tenant styling, naming conventions, crests, and currency/timezone localization.',
    status: 'COMPLETED',
    keyDeliverables: [
      'Zero hardcoded school branding architecture',
      'AGSOBA initial tenant configuration with full branding and contact parameters',
      'Secondary school tenant (King\'s College / KCOBA) for multi-school verification',
      'Server-side cross-tenant isolation enforcement barrier (HTTP 403)',
    ],
    acceptanceCriteria: 'Changing authorised branding configuration updates the interface without source-code changes. One tenant cannot modify another tenant\'s branding.',
  },
  {
    phase: 5,
    title: 'Class Set Identity and Eligibility Engine',
    objective: 'Deploy server-side eligibility verification engine supporting transfer entrants, midway leavers, and historical review.',
    status: 'COMPLETED',
    keyDeliverables: ['Automated cohort matching', 'Transfer & midway policy evaluation', 'Century disambiguation rules'],
    acceptanceCriteria: 'All specified class set scenarios covered. No person falsely assigned graduation year or attendance history.',
  },
  {
    phase: 6,
    title: 'Alumni Registration, Verification, and Membership Management',
    objective: 'Implement registration onboarding, class set review queues, bulk approved record imports, and deduplication.',
    status: 'COMPLETED',
    keyDeliverables: ['Verification queue workflow', 'Batch CSV/Excel ingestion pipeline', 'Audit trails for approvals'],
    acceptanceCriteria: 'Registration, verification, rejection, and assignment persist correctly with full deduplication.',
  },
  {
    phase: 7,
    title: 'Class Set Executive and Governance Management',
    objective: 'Implement office appointments, term dates, elections, digital handover protocols, and policy versioning.',
    status: 'COMPLETED',
    keyDeliverables: ['Executive appointment register', 'Term auto-expiration triggers', 'Handover memorandum workflow'],
    acceptanceCriteria: 'Executive changes auditable; expired appointments cannot authorise privileged actions.',
  },
  {
    phase: 8,
    title: 'Member Directory and Profiles',
    objective: 'Searchable alumni directory with granular privacy controls, professional profiles, and contact gateways.',
    status: 'COMPLETED',
    keyDeliverables: ['Opt-in directory filters', 'Privacy field-level masking', 'Subgroup affiliations'],
    acceptanceCriteria: 'Directory searches return authorised records only; private contact data remains strictly private.',
  },
  {
    phase: 9,
    title: 'Communications Centre',
    objective: 'Official announcements, targeted audience broadcasts, message approval workflows, and delivery auditing.',
    status: 'COMPLETED',
    keyDeliverables: ['Multi-channel broadcast queue', 'Template manager', 'Delivery status dashboard'],
    acceptanceCriteria: 'Announcements persist and respect permissions. Unconfigured providers produce explicit unavailable states.',
  },
  {
    phase: 10,
    title: 'Meetings, Minutes, Resolutions, and Tasks',
    objective: 'Formal meeting agendas, attendance registers, minute adoption workflows, and resolution trackers.',
    status: 'COMPLETED',
    keyDeliverables: ['Meeting planner', 'Cryptographically referenced minute approvals', 'Resolution ledger'],
    acceptanceCriteria: 'Meeting records and decisions persistent and searchable. Approved resolutions have traceable origins.',
  },
  {
    phase: 11,
    title: 'Polls, Surveys, and Formal Voting',
    objective: 'Formal secret-ballot elections, quorum calculation, constitutional referendum engine, and certification.',
    status: 'COMPLETED',
    keyDeliverables: ['Anonymized ballot vault', 'Eligibility validator', 'Tally certification report'],
    acceptanceCriteria: 'Voting eligibility enforced on server. Secret ballots do not expose voter choices to anyone.',
  },
  {
    phase: 12,
    title: 'Events and Reunion Management',
    objective: 'Reunion planning, ticketing, guest passes, check-in validation, and post-event memorial galleries.',
    status: 'COMPLETED',
    keyDeliverables: ['Reunion ticket tiers', 'QR code badge generator', 'Attendance reconciliation'],
    acceptanceCriteria: 'Registrations and attendance are distinct records. Capacity and deadlines enforced server-side.',
  },
  {
    phase: 13,
    title: 'Financial Management and Payment Integration',
    objective: 'Dues obligations, payments, contributions, pledges, expenses, multi-level approvals, and gateway integrations.',
    status: 'PENDING_PRIOR_PHASE',
    keyDeliverables: ['Double-entry ledger journal', 'Paystack/Flutterwave webhook handler', 'Auditor reconciliation generator'],
    acceptanceCriteria: 'Financial transactions traceable and immutable. Server-side payment verification. No client-declared success.',
  },
  {
    phase: 14,
    title: 'Confidential Welfare Management',
    objective: 'Distress and medical aid intake, confidential committee reviews, emergency disbursements, and closure.',
    status: 'PENDING_PRIOR_PHASE',
    keyDeliverables: ['Encrypted case file vault', 'Welfare committee access gateway', 'Disbursement tracking'],
    acceptanceCriteria: 'Only authorized welfare personnel access case records. Sensitive data excluded from general reports.',
  },
  {
    phase: 15,
    title: 'Projects and Development Initiatives',
    objective: 'School development projects, alumni-sponsored infrastructure proposals, milestone audits, and donor walls.',
    status: 'PENDING_PRIOR_PHASE',
    keyDeliverables: ['Project milestone engine', 'Fundraising progress tracker', 'Capital campaign reports'],
    acceptanceCriteria: 'Project financial records reconcile with underlying transactions. Approved budgets locked.',
  },
  {
    phase: 16,
    title: 'Digital Heritage Archive and Documents',
    objective: 'Century-spanning historical photographs, school magazines, valedictory speeches, oral histories, and metadata.',
    status: 'PENDING_PRIOR_PHASE',
    keyDeliverables: ['Metadata catalog with provenance tags', 'Access-controlled media storage', 'Historical timeline view'],
    acceptanceCriteria: 'Files stored persistently with provenance metadata. Private records not exposed via public URLs.',
  },
  {
    phase: 17,
    title: 'Professional Network, Business Directory, and Mentorship',
    objective: 'Verified alumni business directory, career mentorship matching, and professional collaboration boards.',
    status: 'PENDING_PRIOR_PHASE',
    keyDeliverables: ['Vetted business registry', 'Mentor-mentee pairing queue', 'Professional opportunities board'],
    acceptanceCriteria: 'Listings moderated with verified credentials. Real persisted records, no mock demo items.',
  },
  {
    phase: 18,
    title: 'Central Association Oversight and Reporting',
    objective: 'Central executive dashboard, dormant class set monitoring, charter compliance, and association-wide analytics.',
    status: 'PENDING_PRIOR_PHASE',
    keyDeliverables: ['Central association oversight portal', 'Compliance scoreboard', 'Federated health analytics'],
    acceptanceCriteria: 'Central officers perform oversight without unrestricted access to private class set records.',
  },
  {
    phase: 19,
    title: 'Production Hardening and End-to-End Verification',
    objective: 'Comprehensive penetration audit, automated RLS isolation verification, backup restoration drills, accessibility.',
    status: 'PENDING_PRIOR_PHASE',
    keyDeliverables: ['Penetration test report', 'RLS isolation test matrix', 'Disaster recovery runbook'],
    acceptanceCriteria: 'Critical security and financial integrity tests pass. Zero unresolved release blockers.',
  },
  {
    phase: 20,
    title: 'Production Deployment and Operational Handover',
    objective: 'Production environment provisioning, monitoring, backup cron automation, and administrative handover.',
    status: 'PENDING_PRIOR_PHASE',
    keyDeliverables: ['Automated deployment pipeline', 'Health monitoring & alerting', 'Administrative handover documentation'],
    acceptanceCriteria: 'Production build deploys cleanly, health checks pass, verified workflows run against production backend.',
  },
];

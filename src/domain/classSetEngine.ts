/**
 * AGSOBA Enterprise Alumni Management Platform
 * Phase 1 Architecture: Class Set Identity & Membership Eligibility Engine
 * 
 * Strict Domain Model and Business Rules Implementation
 */

export interface TenantConfig {
  tenantId: string;
  schoolName: string;
  associationName: string;
  associationAcronym: string;
  location: string;
  country: string;
  defaultCurrency: string;
  defaultTimezone: string;
  classSetIdentifierFormat: string; // e.g. "{acronym} {yy_adm}{zz_grad}"
}

export type MembershipCategory =
  | 'STANDARD_COHORT'
  | 'MIDWAY_LEAVER_RECOGNISED'
  | 'TRANSFER_ENTRANT_RECOGNISED'
  | 'SPECIALLY_RECOGNISED'
  | 'PENDING_CLASSIFICATION'
  | 'DISPUTED_CLASSIFICATION';

export interface MembershipRights {
  canVote: boolean;
  canHoldOffice: boolean;
  duesObligation: boolean;
  canAttendReunions: boolean;
  canAccessDirectory: boolean;
}

export interface SchoolAttendanceFact {
  identityId: string;
  fullName: string;
  actualAdmissionYear: number; // Authoritative 4-digit year
  actualExitYear: number;      // Authoritative 4-digit year
  entryFormOrClass: string;    // e.g. "Form 1", "JSS 1", "Form 4 / SSS 1"
  exitFormOrClass: string;     // e.g. "Form 3", "Form 5 / SSS 3"
  graduatedFromSchool: boolean;
  departureReason?: string;
  notes?: string;
}

export interface CanonicalClassSet {
  id: string;
  tenantId: string;
  associationId: string;
  admissionYear: number;   // Full 4-digit authoritative integer (e.g., 1983)
  graduationYear: number;  // Full 4-digit authoritative integer (e.g., 1988)
  officialIdentifier: string; // e.g. "AGSOBA 8388"
  officialDisplayName: string; // e.g. "AGSOBA 8388 (1983–1988)" or "AGSOBA 8388"
  hasCenturyCollision: boolean;
  status: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONAL';
  createdAt: string;
}

export interface MembershipEligibilityEvaluation {
  identityId: string;
  targetClassSetId: string;
  targetClassSetIdentifier: string;
  isEligible: boolean;
  category: MembershipCategory;
  basisOfRecognition: string;
  rights: MembershipRights;
  attendanceIntegrityVerified: boolean; // Confirms factual attendance was NOT falsified
  attendanceFacts: SchoolAttendanceFact;
  auditTrail: string[];
}

/**
 * Initial Default Configuration for Abeokuta Grammar School Old Boys Association (AGSOBA)
 * Stored as a validated configuration contract, never hardcoded into UI views.
 */
export const DEFAULT_AGSOBA_TENANT: TenantConfig = {
  tenantId: 'tenant_agsoba_abeokuta',
  schoolName: 'Abeokuta Grammar School',
  associationName: 'Abeokuta Grammar School Old Boys Association',
  associationAcronym: 'AGSOBA',
  location: 'Abeokuta, Ogun State, Nigeria',
  country: 'Nigeria',
  defaultCurrency: 'NGN',
  defaultTimezone: 'Africa/Lagos',
  classSetIdentifierFormat: '{acronym} {yy_adm}{zz_grad}',
};

/**
 * Computes official human-readable class set identifier from authoritative 4-digit years.
 * Formula: AGSOBA YYZZ (YY = 2-digit admission, ZZ = 2-digit graduation)
 */
export function generateClassSetIdentifier(
  acronym: string,
  admissionYear: number,
  graduationYear: number
): string {
  if (admissionYear > graduationYear) {
    throw new Error(
      `Invalid year configuration: Admission year (${admissionYear}) cannot be greater than graduation year (${graduationYear})`
    );
  }
  const yy = String(admissionYear % 100).padStart(2, '0');
  const zz = String(graduationYear % 100).padStart(2, '0');
  return `${acronym.trim()} ${yy}${zz}`;
}

/**
 * Detects whether another class set in the association shares the exact same 2-digit suffix across centuries
 * (e.g. 1883–1888 vs 1983–1988), producing collision-free canonical display labels.
 */
export function resolveCanonicalClassSet(
  tenant: TenantConfig,
  associationId: string,
  admissionYear: number,
  graduationYear: number,
  existingSetsInAssociation: Array<{ admissionYear: number; graduationYear: number }>
): CanonicalClassSet {
  const identifier = generateClassSetIdentifier(tenant.associationAcronym, admissionYear, graduationYear);

  // Check for century collision with other sets
  const collision = existingSetsInAssociation.some((other) => {
    const isSameSpan =
      other.admissionYear !== admissionYear || other.graduationYear !== graduationYear;
    const sameIdentifier =
      generateClassSetIdentifier(tenant.associationAcronym, other.admissionYear, other.graduationYear) ===
      identifier;
    return isSameSpan && sameIdentifier;
  });

  const officialDisplayName = collision
    ? `${identifier} (${admissionYear}–${graduationYear})`
    : `${identifier}`;

  return {
    id: `cs_${tenant.associationAcronym.toLowerCase()}_${admissionYear}_${graduationYear}`,
    tenantId: tenant.tenantId,
    associationId,
    admissionYear,
    graduationYear,
    officialIdentifier: identifier,
    officialDisplayName,
    hasCenturyCollision: collision,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Membership Rights Matrix by Category
 * Enforced on the server; never modified by client requests.
 */
export const CATEGORY_RIGHTS: Record<MembershipCategory, MembershipRights> = {
  STANDARD_COHORT: {
    canVote: true,
    canHoldOffice: true,
    duesObligation: true,
    canAttendReunions: true,
    canAccessDirectory: true,
  },
  TRANSFER_ENTRANT_RECOGNISED: {
    canVote: true,
    canHoldOffice: true,
    duesObligation: true,
    canAttendReunions: true,
    canAccessDirectory: true,
  },
  MIDWAY_LEAVER_RECOGNISED: {
    canVote: true,
    canHoldOffice: false, // Subject to association constitution
    duesObligation: true,
    canAttendReunions: true,
    canAccessDirectory: true,
  },
  SPECIALLY_RECOGNISED: {
    canVote: false,
    canHoldOffice: false,
    duesObligation: false,
    canAttendReunions: true,
    canAccessDirectory: true,
  },
  PENDING_CLASSIFICATION: {
    canVote: false,
    canHoldOffice: false,
    duesObligation: false,
    canAttendReunions: false,
    canAccessDirectory: false,
  },
  DISPUTED_CLASSIFICATION: {
    canVote: false,
    canHoldOffice: false,
    duesObligation: false,
    canAttendReunions: false,
    canAccessDirectory: false,
  },
};

/**
 * Evaluates alumni membership eligibility against a target Class Set according to
 * constitutional guidelines WITHOUT falsifying school attendance records.
 */
export function evaluateMembershipEligibility(
  attendance: SchoolAttendanceFact,
  targetClassSet: CanonicalClassSet,
  associationPolicy: {
    recognizeMidwayLeavers: boolean;
    recognizeTransferEntrants: boolean;
    minYearsAttendedForMidway?: number;
  }
): MembershipEligibilityEvaluation {
  const auditTrail: string[] = [];
  auditTrail.push(
    `Evaluating member ${attendance.fullName} (Adm: ${attendance.actualAdmissionYear}, Exit: ${attendance.actualExitYear}, Graduated: ${attendance.graduatedFromSchool}) against Class Set ${targetClassSet.officialIdentifier} (${targetClassSet.admissionYear}–${targetClassSet.graduationYear}).`
  );

  // Scenario 1: Standard Cohort Alumnus (Admitted same year, graduated same year)
  if (
    attendance.actualAdmissionYear === targetClassSet.admissionYear &&
    attendance.actualExitYear === targetClassSet.graduationYear &&
    attendance.graduatedFromSchool
  ) {
    auditTrail.push(`Exact cohort match verified: Full admission and graduation aligned.`);
    return {
      identityId: attendance.identityId,
      targetClassSetId: targetClassSet.id,
      targetClassSetIdentifier: targetClassSet.officialIdentifier,
      isEligible: true,
      category: 'STANDARD_COHORT',
      basisOfRecognition: 'Standard completion of curriculum from admission to graduation.',
      rights: CATEGORY_RIGHTS.STANDARD_COHORT,
      attendanceIntegrityVerified: true,
      attendanceFacts: attendance,
      auditTrail,
    };
  }

  // Scenario 2: Midway Leaver Recognised by Policy
  // Admitted in cohort admission year, but left before graduation year
  if (
    attendance.actualAdmissionYear === targetClassSet.admissionYear &&
    attendance.actualExitYear < targetClassSet.graduationYear &&
    !attendance.graduatedFromSchool
  ) {
    if (associationPolicy.recognizeMidwayLeavers) {
      const yearsAttended = attendance.actualExitYear - attendance.actualAdmissionYear;
      const minYears = associationPolicy.minYearsAttendedForMidway ?? 1;

      if (yearsAttended >= minYears) {
        auditTrail.push(
          `Midway Leaver Recognized: Admitted in ${attendance.actualAdmissionYear}, exited in ${attendance.actualExitYear} (${yearsAttended} yrs). Policy permits affiliation with entering class without fabricating graduation date.`
        );
        return {
          identityId: attendance.identityId,
          targetClassSetId: targetClassSet.id,
          targetClassSetIdentifier: targetClassSet.officialIdentifier,
          isEligible: true,
          category: 'MIDWAY_LEAVER_RECOGNISED',
          basisOfRecognition: `Admitted with entering cohort in ${attendance.actualAdmissionYear}; withdrew in ${attendance.actualExitYear} at ${attendance.exitFormOrClass}. Recognized under Association Constitution Article 4.`,
          rights: CATEGORY_RIGHTS.MIDWAY_LEAVER_RECOGNISED,
          attendanceIntegrityVerified: true, // Factual attendance exit year preserved as 1985, not 1988!
          attendanceFacts: attendance,
          auditTrail,
        };
      }
    }
  }

  // Scenario 3: Transfer Entrant Recognised by Policy
  // Admitted after cohort admission year, but completed school in graduation year
  if (
    attendance.actualAdmissionYear > targetClassSet.admissionYear &&
    attendance.actualExitYear === targetClassSet.graduationYear &&
    attendance.graduatedFromSchool
  ) {
    if (associationPolicy.recognizeTransferEntrants) {
      auditTrail.push(
        `Transfer Entrant Recognized: Transferred into Abeokuta Grammar School in ${attendance.actualAdmissionYear} (${attendance.entryFormOrClass}) and graduated with class in ${targetClassSet.graduationYear}. Fact of admission retained without falsification.`
      );
      return {
        identityId: attendance.identityId,
        targetClassSetId: targetClassSet.id,
        targetClassSetIdentifier: targetClassSet.officialIdentifier,
        isEligible: true,
        category: 'TRANSFER_ENTRANT_RECOGNISED',
        basisOfRecognition: `Direct transfer admission in ${attendance.actualAdmissionYear}; graduated with the cohort in ${targetClassSet.graduationYear}. Recognized under Association Transfer Policy.`,
        rights: CATEGORY_RIGHTS.TRANSFER_ENTRANT_RECOGNISED,
        attendanceIntegrityVerified: true, // Admission preserved as 1986, not 1983!
        attendanceFacts: attendance,
        auditTrail,
      };
  }
  }

  // Scenario 4: Same-Year Fast-track / HSC Sixth Form
  if (
    attendance.actualAdmissionYear === targetClassSet.admissionYear &&
    attendance.actualExitYear === targetClassSet.graduationYear &&
    attendance.actualAdmissionYear === attendance.actualExitYear
  ) {
    auditTrail.push(`Same-year admission and graduation verified under specialized sixth-form / HSC rules.`);
    return {
      identityId: attendance.identityId,
      targetClassSetId: targetClassSet.id,
      targetClassSetIdentifier: targetClassSet.officialIdentifier,
      isEligible: true,
      category: 'STANDARD_COHORT',
      basisOfRecognition: 'Verified completion of accelerated / HSC single-year program.',
      rights: CATEGORY_RIGHTS.STANDARD_COHORT,
      attendanceIntegrityVerified: true,
      attendanceFacts: attendance,
      auditTrail,
    };
  }

  // Inconclusive / Outside Cohort Range
  auditTrail.push(
    `Attendance span (${attendance.actualAdmissionYear}–${attendance.actualExitYear}) does not align with Class Set ${targetClassSet.officialIdentifier} under current association policy.`
  );
  return {
    identityId: attendance.identityId,
    targetClassSetId: targetClassSet.id,
    targetClassSetIdentifier: targetClassSet.officialIdentifier,
    isEligible: false,
    category: 'PENDING_CLASSIFICATION',
    basisOfRecognition: 'No matching constitutional criteria found. Requires historical judiciary review.',
    rights: CATEGORY_RIGHTS.PENDING_CLASSIFICATION,
    attendanceIntegrityVerified: true,
    attendanceFacts: attendance,
    auditTrail,
  };
}

/**
 * Phase 1 Automated Self-Verification Suite
 * Validates the core acceptance criteria specified in Master Implementation Directive Section 4 & Phase 1.
 */
export function runPhase1VerificationSuite(): {
  allPassed: boolean;
  testCount: number;
  passCount: number;
  failCount: number;
  results: Array<{ name: string; passed: boolean; message: string; details?: unknown }>;
} {
  const results: Array<{ name: string; passed: boolean; message: string; details?: unknown }> = [];

  const defaultPolicy = {
    recognizeMidwayLeavers: true,
    recognizeTransferEntrants: true,
    minYearsAttendedForMidway: 2,
  };

  // Test 1: Standard 1983-1988 generation produces AGSOBA 8388
  try {
    const id8388 = generateClassSetIdentifier('AGSOBA', 1983, 1988);
    const passed = id8388 === 'AGSOBA 8388';
    results.push({
      name: 'Class Set Identifier Formula (1983-1988 -> AGSOBA 8388)',
      passed,
      message: passed ? 'Produced exact AGSOBA 8388 format' : `Failed: got ${id8388}`,
    });
  } catch (e: any) {
    results.push({ name: 'Class Set Identifier Formula', passed: false, message: e.message });
  }

  // Test 2: Century collision detection (1883-1888 vs 1983-1988)
  try {
    const existingSets = [{ admissionYear: 1883, graduationYear: 1888 }];
    const set1983 = resolveCanonicalClassSet(
      DEFAULT_AGSOBA_TENANT,
      'asc_agsoba_01',
      1983,
      1988,
      existingSets
    );
    const passed = set1983.hasCenturyCollision && set1983.officialDisplayName.includes('1983–1988');
    results.push({
      name: 'Century Collision Prevention (1883-1888 vs 1983-1988 Disambiguation)',
      passed,
      message: passed
        ? `Collision detected; disambiguated display name to: "${set1983.officialDisplayName}"`
        : 'Failed: century collision was not flagged',
      details: set1983,
    });
  } catch (e: any) {
    results.push({ name: 'Century Collision Prevention', passed: false, message: e.message });
  }

  // Test 3: Midway leaver preserves factual exit year without fabricating graduation year
  try {
    const classSet8388 = resolveCanonicalClassSet(
      DEFAULT_AGSOBA_TENANT,
      'asc_agsoba_01',
      1983,
      1988,
      []
    );
    const midwayAttendance: SchoolAttendanceFact = {
      identityId: 'id_alumnus_midway',
      fullName: 'Babatunde Adeleke',
      actualAdmissionYear: 1983,
      actualExitYear: 1985, // Left in Form 3
      entryFormOrClass: 'Form 1',
      exitFormOrClass: 'Form 3',
      graduatedFromSchool: false,
      departureReason: 'Family relocation to Kaduna',
    };

    const evalResult = evaluateMembershipEligibility(midwayAttendance, classSet8388, defaultPolicy);
    const passed =
      evalResult.isEligible &&
      evalResult.category === 'MIDWAY_LEAVER_RECOGNISED' &&
      evalResult.attendanceFacts.actualExitYear === 1985 &&
      evalResult.attendanceFacts.graduatedFromSchool === false &&
      evalResult.rights.canHoldOffice === false; // Constitutional limit

    results.push({
      name: 'Midway Leaver Zero-Falsification Rule (Admitted 1983, Exited 1985)',
      passed,
      message: passed
        ? 'Verified: Associated with AGSOBA 8388 while factual exit year 1985 and non-graduation status remain strictly unaltered'
        : 'Failed to verify midway leaver integrity',
      details: evalResult,
    });
  } catch (e: any) {
    results.push({ name: 'Midway Leaver Zero-Falsification Rule', passed: false, message: e.message });
  }

  // Test 4: Transfer entrant preserves factual admission year (1986)
  try {
    const classSet8388 = resolveCanonicalClassSet(
      DEFAULT_AGSOBA_TENANT,
      'asc_agsoba_01',
      1983,
      1988,
      []
    );
    const transferAttendance: SchoolAttendanceFact = {
      identityId: 'id_alumnus_transfer',
      fullName: 'Oluwaseun Sowande',
      actualAdmissionYear: 1986, // Entered in Form 4
      actualExitYear: 1988,
      entryFormOrClass: 'Form 4',
      exitFormOrClass: 'Form 5',
      graduatedFromSchool: true,
      departureReason: 'Graduated WASSCE',
    };

    const evalResult = evaluateMembershipEligibility(transferAttendance, classSet8388, defaultPolicy);
    const passed =
      evalResult.isEligible &&
      evalResult.category === 'TRANSFER_ENTRANT_RECOGNISED' &&
      evalResult.attendanceFacts.actualAdmissionYear === 1986 &&
      evalResult.rights.canVote === true;

    results.push({
      name: 'Transfer Entrant Zero-Falsification Rule (Admitted 1986, Graduated 1988)',
      passed,
      message: passed
        ? 'Verified: Associated with AGSOBA 8388 while factual admission year 1986 is strictly preserved'
        : 'Failed to verify transfer entrant integrity',
      details: evalResult,
    });
  } catch (e: any) {
    results.push({ name: 'Transfer Entrant Zero-Falsification Rule', passed: false, message: e.message });
  }

  // Test 5: Rejection of invalid year order (Admission > Graduation)
  try {
    let errorCaught = false;
    try {
      generateClassSetIdentifier('AGSOBA', 1988, 1983);
    } catch {
      errorCaught = true;
    }
    results.push({
      name: 'Constraint Validation: Admission Year Cannot Exceed Graduation Year',
      passed: errorCaught,
      message: errorCaught
        ? 'Verified: Engine rejects inverse admission/graduation years'
        : 'Failed: Engine permitted admission > graduation',
    });
  } catch (e: any) {
    results.push({ name: 'Constraint Validation', passed: false, message: e.message });
  }

  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.length - passCount;

  return {
    allPassed: failCount === 0,
    testCount: results.length,
    passCount,
    failCount,
    results,
  };
}

/**
 * OIML R76 Rules Engine
 * Versioned, modular, configurable.
 *
 * Architecture:
 *   TestDefinition → InputParameters → ValidationRules → CalculationRules
 *   → ErrorLimits → ComplianceRules → Result
 *
 * [OIML-VERIFY] annotations mark values/formulas that must be verified
 * against the official OIML R 76-1 standard before production use.
 */

export type AccuracyClass = 'I' | 'II' | 'III' | 'IIII';
export type TestStatus = 'pass' | 'fail' | 'not_applicable' | 'pending';

export interface CalculationTrace {
  formula: string;
  inputs: Record<string, number | string>;
  result: number;
  permissibleError?: number;
  actualError?: number;
  passFail: 'pass' | 'fail';
  standardVersion: string;
  ruleId: string;
  notes?: string;
}

export interface TestModuleResult {
  moduleId: string;
  moduleName: string;
  standardReference: string;
  status: TestStatus;
  calculations: CalculationTrace[];
  summary: string;
}

// ─── Permissible Error Limits ─────────────────────────────────────────────────
// [OIML-VERIFY] Table 1 of OIML R 76-1:2006
// Permissible errors for initial verification
export const PERMISSIBLE_ERRORS: Record<AccuracyClass, {
  zeroToFifty: number;    // multiplier of e for loads 0 < m ≤ 500e (class I) etc.
  fiftyToTwo: number;
  twoToMax: number;
  limits: Array<{ maxIntervals: number; multiplier: number }>;
}> = {
  'I': {
    // [OIML-VERIFY] For class I: ±0.5e up to 50000e, ±1e up to 200000e, ±1.5e above
    zeroToFifty: 0.5,
    fiftyToTwo: 1.0,
    twoToMax: 1.5,
    limits: [
      { maxIntervals: 50000, multiplier: 0.5 },
      { maxIntervals: 200000, multiplier: 1.0 },
      { maxIntervals: Infinity, multiplier: 1.5 },
    ],
  },
  'II': {
    // [OIML-VERIFY] For class II: ±0.5e up to 5000e, ±1e up to 20000e, ±1.5e above
    zeroToFifty: 0.5,
    fiftyToTwo: 1.0,
    twoToMax: 1.5,
    limits: [
      { maxIntervals: 5000, multiplier: 0.5 },
      { maxIntervals: 20000, multiplier: 1.0 },
      { maxIntervals: Infinity, multiplier: 1.5 },
    ],
  },
  'III': {
    // [OIML-VERIFY] For class III: ±0.5e up to 500e, ±1e up to 2000e, ±1.5e above
    zeroToFifty: 0.5,
    fiftyToTwo: 1.0,
    twoToMax: 1.5,
    limits: [
      { maxIntervals: 500, multiplier: 0.5 },
      { maxIntervals: 2000, multiplier: 1.0 },
      { maxIntervals: Infinity, multiplier: 1.5 },
    ],
  },
  'IIII': {
    // [OIML-VERIFY] For class IIII: ±0.5e up to 50e, ±1e up to 200e, ±1.5e above
    zeroToFifty: 0.5,
    fiftyToTwo: 1.0,
    twoToMax: 1.5,
    limits: [
      { maxIntervals: 50, multiplier: 0.5 },
      { maxIntervals: 200, multiplier: 1.0 },
      { maxIntervals: Infinity, multiplier: 1.5 },
    ],
  },
};

/**
 * Calculate permissible error for a given load.
 * [OIML-VERIFY] R76-1:2006 Section 3.5 and Table 1
 */
export function getPermissibleError(
  load: number,
  e: number,
  accuracyClass: AccuracyClass
): number {
  const classLimits = PERMISSIBLE_ERRORS[accuracyClass];
  const n = load / e; // number of scale intervals at this load
  for (const limit of classLimits.limits) {
    if (n <= limit.maxIntervals) {
      return limit.multiplier * e;
    }
  }
  return 1.5 * e; // fallback
}

// ─── Test Module Definitions ──────────────────────────────────────────────────
export interface TestModuleDefinition {
  id: string;
  name: string;
  standardReference: string;
  description: string;
  requiredFor: AccuracyClass[];
  requiredEquipment: string[];
  observationFields: ObservationField[];
  calculate: (inputs: Record<string, number>, params: InstrumentParams) => TestModuleResult;
}

export interface ObservationField {
  key: string;
  label: string;
  unit: string;
  type: 'number' | 'text';
  required: boolean;
  min?: number;
  max?: number;
  description?: string;
}

export interface InstrumentParams {
  accuracyClass: AccuracyClass;
  maxCapacity: number;
  minCapacity: number;
  e: number;   // verification scale interval
  d: number;   // display resolution
  n: number;   // number of intervals = Max/e
}

// ─── MODULE: Repeatability Test ───────────────────────────────────────────────
// [OIML-VERIFY] OIML R76-1:2006 Section 4.5
const repeatabilityModule: TestModuleDefinition = {
  id: 'repeatability',
  name: 'Repeatability Test',
  standardReference: 'OIML R76-1:2006 Section 4.5',
  description: 'Determines whether the instrument gives consistent readings for the same load applied multiple times.',
  requiredFor: ['I', 'II', 'III', 'IIII'],
  requiredEquipment: ['Reference test weights (OIML class E2 or better)'],
  observationFields: [
    { key: 'testLoad', label: 'Test Load', unit: 'kg', type: 'number', required: true, description: 'Load applied for repeatability (typically ≈ 50% of Max)' },
    { key: 'r1', label: 'Reading 1', unit: 'kg', type: 'number', required: true },
    { key: 'r2', label: 'Reading 2', unit: 'kg', type: 'number', required: true },
    { key: 'r3', label: 'Reading 3', unit: 'kg', type: 'number', required: true },
    { key: 'r4', label: 'Reading 4', unit: 'kg', type: 'number', required: false },
    { key: 'r5', label: 'Reading 5', unit: 'kg', type: 'number', required: false },
    { key: 'r6', label: 'Reading 6', unit: 'kg', type: 'number', required: false },
  ],
  calculate(inputs, params) {
    const readings = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']
      .map(k => inputs[k])
      .filter(v => v !== undefined && v !== null && !isNaN(v));

    if (readings.length < 3) {
      return {
        moduleId: this.id,
        moduleName: this.name,
        standardReference: this.standardReference,
        status: 'pending',
        calculations: [],
        summary: 'Insufficient observations — minimum 3 readings required.',
      };
    }

    const maxReading = Math.max(...readings);
    const minReading = Math.min(...readings);
    const range = maxReading - minReading;

    // [OIML-VERIFY] R76-1 Section 4.5: repeatability deviation ≤ 0.5e (initial verification)
    const permissibleDeviation = 0.5 * params.e;
    const passes = range <= permissibleDeviation;

    const calc: CalculationTrace = {
      formula: 'Range = max(readings) - min(readings); Pass if Range ≤ 0.5e',
      inputs: {
        readings: readings.join(', '),
        maxReading,
        minReading,
        'e (verification scale interval)': params.e,
        'permissible deviation (0.5e)': permissibleDeviation,
      },
      result: range,
      permissibleError: permissibleDeviation,
      actualError: range,
      passFail: passes ? 'pass' : 'fail',
      standardVersion: 'OIML_R76_2006',
      ruleId: 'repeatability_deviation',
      notes: '[OIML-VERIFY] 0.5e limit per R76-1:2006 Section 4.5',
    };

    return {
      moduleId: this.id,
      moduleName: this.name,
      standardReference: this.standardReference,
      status: passes ? 'pass' : 'fail',
      calculations: [calc],
      summary: `Repeatability range: ${range.toFixed(4)} kg. Permissible: ${permissibleDeviation.toFixed(4)} kg. Result: ${passes ? 'PASS' : 'FAIL'}`,
    };
  },
};

// ─── MODULE: Accuracy / Error Test ───────────────────────────────────────────
// [OIML-VERIFY] OIML R76-1:2006 Section 4.1 and Table 1
const accuracyModule: TestModuleDefinition = {
  id: 'accuracy',
  name: 'Accuracy (Error) Test',
  standardReference: 'OIML R76-1:2006 Section 4.1, Table 1',
  description: 'Verifies that indication error at various loads is within permissible limits.',
  requiredFor: ['I', 'II', 'III', 'IIII'],
  requiredEquipment: ['Reference test weights OIML class E2 or better', 'Fractional weights'],
  observationFields: [
    { key: 'load1', label: 'Test Load 1', unit: 'kg', type: 'number', required: true },
    { key: 'indication1', label: 'Indication at Load 1', unit: 'kg', type: 'number', required: true },
    { key: 'load2', label: 'Test Load 2', unit: 'kg', type: 'number', required: false },
    { key: 'indication2', label: 'Indication at Load 2', unit: 'kg', type: 'number', required: false },
    { key: 'load3', label: 'Test Load 3', unit: 'kg', type: 'number', required: false },
    { key: 'indication3', label: 'Indication at Load 3', unit: 'kg', type: 'number', required: false },
    { key: 'load4', label: 'Test Load 4 (≈ Max)', unit: 'kg', type: 'number', required: false },
    { key: 'indication4', label: 'Indication at Load 4', unit: 'kg', type: 'number', required: false },
  ],
  calculate(inputs, params) {
    const pairs: Array<{ load: number; indication: number }> = [];
    for (let i = 1; i <= 4; i++) {
      const load = inputs[`load${i}`];
      const indication = inputs[`indication${i}`];
      if (load !== undefined && indication !== undefined && !isNaN(load) && !isNaN(indication)) {
        pairs.push({ load, indication });
      }
    }

    if (pairs.length === 0) {
      return { moduleId: this.id, moduleName: this.name, standardReference: this.standardReference, status: 'pending', calculations: [], summary: 'No load/indication pairs entered.' };
    }

    const calculations: CalculationTrace[] = pairs.map(({ load, indication }) => {
      const error = indication - load;
      const permissibleError = getPermissibleError(load, params.e, params.accuracyClass);
      const passes = Math.abs(error) <= permissibleError;
      return {
        formula: 'Error = Indication - Load; Pass if |Error| ≤ MPE',
        inputs: { load, indication, 'e': params.e, 'AccuracyClass': params.accuracyClass },
        result: error,
        permissibleError,
        actualError: error,
        passFail: passes ? 'pass' : 'fail',
        standardVersion: 'OIML_R76_2006',
        ruleId: 'accuracy_error',
        notes: '[OIML-VERIFY] MPE from Table 1 of R76-1:2006',
      };
    });

    const allPass = calculations.every(c => c.passFail === 'pass');
    return {
      moduleId: this.id,
      moduleName: this.name,
      standardReference: this.standardReference,
      status: allPass ? 'pass' : 'fail',
      calculations,
      summary: `${calculations.filter(c => c.passFail === 'pass').length}/${calculations.length} load points passed error test.`,
    };
  },
};

// ─── MODULE: Eccentricity Test ────────────────────────────────────────────────
// [OIML-VERIFY] OIML R76-1:2006 Section 4.3
const eccentricityModule: TestModuleDefinition = {
  id: 'eccentricity',
  name: 'Eccentricity Test',
  standardReference: 'OIML R76-1:2006 Section 4.3',
  description: 'Tests that load placed at different positions on the load receptor gives consistent readings.',
  requiredFor: ['I', 'II', 'III', 'IIII'],
  requiredEquipment: ['Reference test weights ≈ 1/3 Max'],
  observationFields: [
    { key: 'testLoad', label: 'Test Load (≈ 1/3 Max)', unit: 'kg', type: 'number', required: true },
    { key: 'center', label: 'Center reading', unit: 'kg', type: 'number', required: true },
    { key: 'front', label: 'Front position reading', unit: 'kg', type: 'number', required: true },
    { key: 'back', label: 'Back position reading', unit: 'kg', type: 'number', required: true },
    { key: 'left', label: 'Left position reading', unit: 'kg', type: 'number', required: true },
    { key: 'right', label: 'Right position reading', unit: 'kg', type: 'number', required: true },
  ],
  calculate(inputs, params) {
    const { testLoad, center, front, back, left, right } = inputs;
    if ([testLoad, center, front, back, left, right].some(v => v === undefined || isNaN(v))) {
      return { moduleId: this.id, moduleName: this.name, standardReference: this.standardReference, status: 'pending', calculations: [], summary: 'Incomplete observations.' };
    }

    const positions = { front, back, left, right };
    // [OIML-VERIFY] R76-1 Section 4.3: diff between any position and center ≤ 0.5e
    const permissibleDiff = 0.5 * params.e;
    const calculations: CalculationTrace[] = Object.entries(positions).map(([pos, reading]) => {
      const diff = Math.abs(reading - center);
      const passes = diff <= permissibleDiff;
      return {
        formula: `Diff(${pos}) = |Reading(${pos}) - Center|; Pass if Diff ≤ 0.5e`,
        inputs: { [`Reading(${pos})`]: reading, center, 'e': params.e, 'permissibleDiff (0.5e)': permissibleDiff },
        result: diff,
        permissibleError: permissibleDiff,
        actualError: diff,
        passFail: passes ? 'pass' : 'fail',
        standardVersion: 'OIML_R76_2006',
        ruleId: 'eccentricity_position',
        notes: '[OIML-VERIFY] 0.5e limit per R76-1:2006 Section 4.3',
      };
    });

    const allPass = calculations.every(c => c.passFail === 'pass');
    return {
      moduleId: this.id,
      moduleName: this.name,
      standardReference: this.standardReference,
      status: allPass ? 'pass' : 'fail',
      calculations,
      summary: `Eccentricity: max deviation ${Math.max(...calculations.map(c => c.result)).toFixed(4)} kg vs permissible ${permissibleDiff.toFixed(4)} kg.`,
    };
  },
};

// ─── MODULE: Zero Indication Test ────────────────────────────────────────────
// [OIML-VERIFY] OIML R76-1:2006 Section 4.2
const zeroModule: TestModuleDefinition = {
  id: 'zero_indication',
  name: 'Zero / No-Load Indication Test',
  standardReference: 'OIML R76-1:2006 Section 4.2',
  description: 'Verifies zero indication within permissible limits under no-load conditions.',
  requiredFor: ['I', 'II', 'III', 'IIII'],
  requiredEquipment: ['No additional weights required'],
  observationFields: [
    { key: 'zeroIndication', label: 'Zero Indication (no load)', unit: 'kg', type: 'number', required: true, description: 'Reading at no load (should be 0 or within ±0.25e)' },
  ],
  calculate(inputs, params) {
    const { zeroIndication } = inputs;
    if (zeroIndication === undefined || isNaN(zeroIndication)) {
      return { moduleId: this.id, moduleName: this.name, standardReference: this.standardReference, status: 'pending', calculations: [], summary: 'No zero indication entered.' };
    }
    // [OIML-VERIFY] R76-1 Section 4.2: zero indication ≤ ±0.25e
    const permissible = 0.25 * params.e;
    const passes = Math.abs(zeroIndication) <= permissible;
    const calc: CalculationTrace = {
      formula: 'Pass if |ZeroIndication| ≤ 0.25e',
      inputs: { zeroIndication, 'e': params.e, 'permissible (0.25e)': permissible },
      result: zeroIndication,
      permissibleError: permissible,
      actualError: zeroIndication,
      passFail: passes ? 'pass' : 'fail',
      standardVersion: 'OIML_R76_2006',
      ruleId: 'zero_indication',
      notes: '[OIML-VERIFY] 0.25e limit per R76-1:2006 Section 4.2',
    };
    return {
      moduleId: this.id,
      moduleName: this.name,
      standardReference: this.standardReference,
      status: passes ? 'pass' : 'fail',
      calculations: [calc],
      summary: `Zero indication: ${zeroIndication} kg. Permissible: ±${permissible.toFixed(4)} kg. ${passes ? 'PASS' : 'FAIL'}`,
    };
  },
};

// ─── MODULE: Discrimination Test ─────────────────────────────────────────────
// [OIML-VERIFY] OIML R76-1:2006 Section 4.6
const discriminationModule: TestModuleDefinition = {
  id: 'discrimination',
  name: 'Discrimination Test',
  standardReference: 'OIML R76-1:2006 Section 4.6',
  description: 'Verifies that the instrument responds to small load changes of 1.4d.',
  requiredFor: ['I', 'II', 'III', 'IIII'],
  requiredEquipment: ['Reference weights', 'Small fractional weights 1.4d'],
  observationFields: [
    { key: 'testLoad', label: 'Test Load', unit: 'kg', type: 'number', required: true },
    { key: 'readingBefore', label: 'Reading before small load', unit: 'kg', type: 'number', required: true },
    { key: 'smallLoad', label: 'Small additional load (≈ 1.4d)', unit: 'kg', type: 'number', required: true },
    { key: 'readingAfter', label: 'Reading after small load added', unit: 'kg', type: 'number', required: true },
  ],
  calculate(inputs, params) {
    const { readingBefore, smallLoad, readingAfter } = inputs;
    if ([readingBefore, smallLoad, readingAfter].some(v => v === undefined || isNaN(v))) {
      return { moduleId: this.id, moduleName: this.name, standardReference: this.standardReference, status: 'pending', calculations: [], summary: 'Incomplete observations.' };
    }
    // [OIML-VERIFY] R76-1 Section 4.6: adding 1.4d load should change reading by at least 1d
    const changeDetected = readingAfter - readingBefore;
    const requiredChange = params.d; // 1 display division
    const passes = Math.abs(changeDetected) >= requiredChange;
    const calc: CalculationTrace = {
      formula: 'ChangeDetected = ReadingAfter - ReadingBefore; Pass if |Change| ≥ d',
      inputs: { readingBefore, smallLoad, readingAfter, 'd (display resolution)': params.d },
      result: changeDetected,
      permissibleError: requiredChange,
      actualError: changeDetected,
      passFail: passes ? 'pass' : 'fail',
      standardVersion: 'OIML_R76_2006',
      ruleId: 'discrimination',
      notes: '[OIML-VERIFY] 1.4d additional load should produce ≥ 1d change per R76-1:2006 Section 4.6',
    };
    return {
      moduleId: this.id,
      moduleName: this.name,
      standardReference: this.standardReference,
      status: passes ? 'pass' : 'fail',
      calculations: [calc],
      summary: `Detected change: ${changeDetected.toFixed(4)} kg. Required: ≥ ${requiredChange.toFixed(4)} kg (1d). ${passes ? 'PASS' : 'FAIL'}`,
    };
  },
};

// ─── MODULE: Tare Test ────────────────────────────────────────────────────────
// [OIML-VERIFY] OIML R76-1:2006 Section 4.4
const tareModule: TestModuleDefinition = {
  id: 'tare',
  name: 'Tare Test',
  standardReference: 'OIML R76-1:2006 Section 4.4',
  description: 'Verifies tare subtraction accuracy throughout the tare range.',
  requiredFor: ['I', 'II', 'III', 'IIII'],
  requiredEquipment: ['Tare load', 'Test weights'],
  observationFields: [
    { key: 'tareLoad', label: 'Tare Load Applied', unit: 'kg', type: 'number', required: true },
    { key: 'tareIndication', label: 'Indication after tare', unit: 'kg', type: 'number', required: true, description: 'Should read 0 after tare operation' },
    { key: 'testLoad', label: 'Test Load on top of tare', unit: 'kg', type: 'number', required: true },
    { key: 'netIndication', label: 'Net indication', unit: 'kg', type: 'number', required: true },
  ],
  calculate(inputs, params) {
    const { tareIndication, testLoad, netIndication } = inputs;
    if ([tareIndication, testLoad, netIndication].some(v => v === undefined || isNaN(v))) {
      return { moduleId: this.id, moduleName: this.name, standardReference: this.standardReference, status: 'pending', calculations: [], summary: 'Incomplete observations.' };
    }
    // Tare zero indication check
    const permissibleZero = 0.25 * params.e;
    const zeroOk = Math.abs(tareIndication) <= permissibleZero;

    // Net reading accuracy
    const netError = netIndication - testLoad;
    const permissibleNetError = getPermissibleError(testLoad, params.e, params.accuracyClass);
    const netOk = Math.abs(netError) <= permissibleNetError;

    const calculations: CalculationTrace[] = [
      {
        formula: 'TareZeroError = |TareIndication|; Pass if ≤ 0.25e',
        inputs: { tareIndication, 'e': params.e },
        result: Math.abs(tareIndication),
        permissibleError: permissibleZero,
        actualError: tareIndication,
        passFail: zeroOk ? 'pass' : 'fail',
        standardVersion: 'OIML_R76_2006',
        ruleId: 'tare_zero',
        notes: '[OIML-VERIFY] 0.25e tare zero limit per R76-1:2006',
      },
      {
        formula: 'NetError = NetIndication - TestLoad; Pass if |NetError| ≤ MPE',
        inputs: { netIndication, testLoad, 'e': params.e },
        result: netError,
        permissibleError: permissibleNetError,
        actualError: netError,
        passFail: netOk ? 'pass' : 'fail',
        standardVersion: 'OIML_R76_2006',
        ruleId: 'tare_net_error',
        notes: '[OIML-VERIFY] Net error limit per R76-1:2006 Table 1',
      },
    ];
    const allPass = zeroOk && netOk;
    return {
      moduleId: this.id,
      moduleName: this.name,
      standardReference: this.standardReference,
      status: allPass ? 'pass' : 'fail',
      calculations,
      summary: `Tare zero: ${zeroOk ? 'PASS' : 'FAIL'}, Net accuracy: ${netOk ? 'PASS' : 'FAIL'}`,
    };
  },
};

// ─── MODULE: General Examination ─────────────────────────────────────────────
const generalExaminationModule: TestModuleDefinition = {
  id: 'general_examination',
  name: 'General Examination',
  standardReference: 'OIML R76-1:2006 Section 3',
  description: 'Visual and functional examination of the instrument including markings, construction, and documentation.',
  requiredFor: ['I', 'II', 'III', 'IIII'],
  requiredEquipment: [],
  observationFields: [
    { key: 'markingsCorrect', label: 'Markings correct (0=No, 1=Yes)', unit: '', type: 'number', required: true, min: 0, max: 1 },
    { key: 'constructionOk', label: 'Construction satisfactory (0=No, 1=Yes)', unit: '', type: 'number', required: true, min: 0, max: 1 },
    { key: 'documentationComplete', label: 'Documentation complete (0=No, 1=Yes)', unit: '', type: 'number', required: true, min: 0, max: 1 },
    { key: 'sealsOk', label: 'Sealing/Anti-tamper OK (0=No, 1=Yes)', unit: '', type: 'number', required: false, min: 0, max: 1 },
  ],
  calculate(inputs, params) {
    void params;
    const checks = {
      markingsCorrect: inputs.markingsCorrect === 1,
      constructionOk: inputs.constructionOk === 1,
      documentationComplete: inputs.documentationComplete === 1,
      sealsOk: inputs.sealsOk === undefined || inputs.sealsOk === 1,
    };
    const allPass = Object.values(checks).every(Boolean);
    const calc: CalculationTrace = {
      formula: 'All checklist items must pass',
      inputs: inputs as Record<string, number>,
      result: allPass ? 1 : 0,
      passFail: allPass ? 'pass' : 'fail',
      standardVersion: 'OIML_R76_2006',
      ruleId: 'general_examination',
    };
    const failures = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    return {
      moduleId: this.id,
      moduleName: this.name,
      standardReference: this.standardReference,
      status: allPass ? 'pass' : 'fail',
      calculations: [calc],
      summary: allPass ? 'All general examination checks passed.' : `Failed checks: ${failures.join(', ')}`,
    };
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────────
export const TEST_MODULES: Record<string, TestModuleDefinition> = {
  general_examination: generalExaminationModule,
  zero_indication: zeroModule,
  accuracy: accuracyModule,
  repeatability: repeatabilityModule,
  eccentricity: eccentricityModule,
  discrimination: discriminationModule,
  tare: tareModule,
};

export const DEFAULT_TEST_PLAN: string[] = [
  'general_examination',
  'zero_indication',
  'accuracy',
  'repeatability',
  'eccentricity',
  'tare',
  'discrimination',
];

/**
 * Returns which test modules apply for a given instrument.
 */
export function getApplicableTests(params: InstrumentParams): string[] {
  return Object.entries(TEST_MODULES)
    .filter(([, mod]) => mod.requiredFor.includes(params.accuracyClass))
    .map(([id]) => id);
}

/**
 * Run a single test module calculation.
 */
export function runTestModule(
  moduleId: string,
  observations: Record<string, number>,
  params: InstrumentParams
): TestModuleResult {
  const module = TEST_MODULES[moduleId];
  if (!module) {
    return {
      moduleId,
      moduleName: moduleId,
      standardReference: 'Unknown',
      status: 'not_applicable',
      calculations: [],
      summary: `Test module '${moduleId}' not found in rules engine.`,
    };
  }
  return module.calculate(observations, params);
}

/**
 * Run all applicable tests for an instrument session.
 */
export function runAllTests(
  testPlan: string[],
  observationsByModule: Record<string, Record<string, number>>,
  params: InstrumentParams
): Record<string, TestModuleResult> {
  const results: Record<string, TestModuleResult> = {};
  for (const moduleId of testPlan) {
    const observations = observationsByModule[moduleId] ?? {};
    results[moduleId] = runTestModule(moduleId, observations, params);
  }
  return results;
}

/**
 * Calculate overall session compliance.
 */
export function calculateOverallCompliance(results: Record<string, TestModuleResult>): {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  notApplicable: number;
  overallResult: 'pass' | 'fail' | 'pending';
} {
  const values = Object.values(results);
  const total = values.length;
  const passed = values.filter(r => r.status === 'pass').length;
  const failed = values.filter(r => r.status === 'fail').length;
  const pending = values.filter(r => r.status === 'pending').length;
  const notApplicable = values.filter(r => r.status === 'not_applicable').length;

  let overallResult: 'pass' | 'fail' | 'pending' = 'pending';
  if (failed > 0) overallResult = 'fail';
  else if (pending === 0 && passed + notApplicable === total) overallResult = 'pass';

  return { total, passed, failed, pending, notApplicable, overallResult };
}

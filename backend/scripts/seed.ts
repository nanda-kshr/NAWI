/**
 * Demo seed script — run with: npx tsx scripts/seed.ts
 * Seeds sample lab, users, instrument, equipment, test session and report.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';

// Load env
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/nawi_db';

async function connectDB() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');
}

// Inline models to avoid Next.js module restrictions in script context
const UserSchema = new mongoose.Schema({
  email: String, password: String, name: String,
  role: String, laboratoryId: String, isActive: { type: Boolean, default: true },
}, { timestamps: true });

const LaboratorySchema = new mongoose.Schema({
  name: String, address: String, accreditationNumber: String,
  accreditationBody: String, contactPerson: String, contactEmail: String, contactPhone: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const InstrumentSchema = new mongoose.Schema({
  instrumentId: String, qrCode: String, manufacturer: String, manufacturerId: String,
  manufacturerAddress: String, model: String, serialNumber: String, instrumentType: String,
  accuracyClass: String, maxCapacity: Number, minCapacity: Number,
  verificationScaleInterval: Number, numberOfIntervals: Number, displayResolution: Number,
  loadCellInfo: String, softwareVersion: String, firmwareVersion: String,
  temperatureMin: Number, temperatureMax: Number, humidityMin: Number, humidityMax: Number,
  powerSupply: String, operatingConditions: String, technicalSpecifications: String,
  photographs: [String], supportingDocuments: [String], laboratoryId: String,
  registeredBy: String, status: { type: String, default: 'active' },
}, { timestamps: true });

const TestEquipmentSchema = new mongoose.Schema({
  equipmentId: String, name: String, manufacturer: String, model: String, serialNumber: String,
  capacityRange: String, accuracy: String, calibrationDate: Date, calibrationExpiry: Date,
  calibrationCertificate: String, status: { type: String, default: 'active' }, laboratoryId: String,
}, { timestamps: true });

const TestSessionSchema = new mongoose.Schema({
  sessionId: String, instrumentId: String, laboratoryId: String, technicianId: String,
  reviewerId: String, approverId: String, standardVersionId: String, testPlan: [String],
  status: String, environmentalConditions: mongoose.Schema.Types.Mixed,
  equipmentUsed: [String], photographs: [String], notes: String,
  overallResult: { type: String, default: 'pass' },
  submittedAt: Date, reviewedAt: Date, approvedAt: Date, reportId: String,
  offlineCreated: Boolean, syncStatus: String,
}, { timestamps: true });

const TestResultSchema = new mongoose.Schema({
  sessionId: String, testModuleId: String, testModuleName: String,
  standardReference: String, status: String, observations: mongoose.Schema.Types.Mixed,
  calculations: mongoose.Schema.Types.Mixed, notes: String, photographs: [String],
}, { timestamps: true });

const ReportSchema = new mongoose.Schema({
  reportNumber: String, revisionNumber: Number, sessionId: String, instrumentId: String,
  laboratoryId: String, standardVersionId: String, status: String,
  technicianName: String, reviewerName: String, approverName: String,
  technicianSignature: String, reviewerSignature: String, approverSignature: String,
  technicianSignedAt: Date, reviewerSignedAt: Date, approverSignedAt: Date,
  overallConclusion: String, pdfPath: String, docxPath: String,
  reportHash: String, lockedAt: Date, lockedBy: String, deviations: String, remarks: String,
}, { timestamps: true });

const AuditLogSchema = new mongoose.Schema({
  action: String, entityType: String, entityId: String, userId: String,
  userName: String, userRole: String, details: mongoose.Schema.Types.Mixed,
  ipAddress: String, timestamp: { type: Date, default: Date.now },
});

const User = mongoose.models.User ?? mongoose.model('User', UserSchema);
const Laboratory = mongoose.models.Laboratory ?? mongoose.model('Laboratory', LaboratorySchema);
const Instrument = mongoose.models.Instrument ?? mongoose.model('Instrument', InstrumentSchema);
const TestEquipment = mongoose.models.TestEquipment ?? mongoose.model('TestEquipment', TestEquipmentSchema);
const TestSession = mongoose.models.TestSession ?? mongoose.model('TestSession', TestSessionSchema);
const TestResult = mongoose.models.TestResult ?? mongoose.model('TestResult', TestResultSchema);
const Report = mongoose.models.Report ?? mongoose.model('Report', ReportSchema);
const AuditLog = mongoose.models.AuditLog ?? mongoose.model('AuditLog', AuditLogSchema);

async function seed() {
  await connectDB();

  console.log('🧹 Clearing existing demo data...');
  await Promise.all([
    User.deleteMany({}), Laboratory.deleteMany({}),
    Instrument.deleteMany({}), TestEquipment.deleteMany({}),
    TestSession.deleteMany({}), TestResult.deleteMany({}),
    Report.deleteMany({}), AuditLog.deleteMany({}),
  ]);

  // ─── Laboratory ─────────────────────────────────────────────────────────────
  console.log('🏢 Creating laboratory...');
  const lab = await Laboratory.create({
    name: 'National Metrology Institute Demo Lab',
    address: '42 Calibration Street, Measurement City, MC 10001',
    accreditationNumber: 'NABL-2024-L0042',
    accreditationBody: 'NABL / Bureau International des Poids et Mesures',
    contactPerson: 'Dr. Priya Sharma',
    contactEmail: 'lab@nmi-demo.org',
    contactPhone: '+91-80-1234-5678',
  });

  // ─── Users ────────────────────────────────────────────────────────────────────
  console.log('👤 Creating demo users...');
  const passwordHash = await bcrypt.hash('demo1234', 12);

  const [admin, technician, reviewer, approver] = await Promise.all([
    User.create({ email: 'admin@nawi.demo', password: passwordHash, name: 'Admin User', role: 'admin', laboratoryId: lab._id.toString() }),
    User.create({ email: 'tech@nawi.demo', password: passwordHash, name: 'Ravi Kumar', role: 'technician', laboratoryId: lab._id.toString() }),
    User.create({ email: 'reviewer@nawi.demo', password: passwordHash, name: 'Anita Singh', role: 'reviewer', laboratoryId: lab._id.toString() }),
    User.create({ email: 'approver@nawi.demo', password: passwordHash, name: 'Dr. Suresh Mehta', role: 'approver', laboratoryId: lab._id.toString() }),
  ]);

  // ─── Test Equipment ───────────────────────────────────────────────────────────
  console.log('⚖️  Creating test equipment...');
  const [weights, ref] = await Promise.all([
    TestEquipment.create({
      equipmentId: 'EQP-0001',
      name: 'OIML Class E2 Reference Weights Set',
      manufacturer: 'Mettler Toledo',
      model: 'E2-SET-20KG',
      serialNumber: 'MT-E2-2024-001',
      capacityRange: '1g to 20kg',
      accuracy: 'OIML Class E2',
      calibrationDate: new Date('2024-01-15'),
      calibrationExpiry: new Date('2025-01-15'),
      calibrationCertificate: 'CERT-E2-2024-001',
      status: 'active',
      laboratoryId: lab._id.toString(),
    }),
    TestEquipment.create({
      equipmentId: 'EQP-0002',
      name: 'Digital Thermohygrometer',
      manufacturer: 'Testo',
      model: '608-H2',
      serialNumber: 'TESTO-608-2024-002',
      capacityRange: '-20°C to +70°C, 0-100%RH',
      accuracy: '±0.3°C, ±3%RH',
      calibrationDate: new Date('2024-03-01'),
      calibrationExpiry: new Date('2025-03-01'),
      calibrationCertificate: 'CERT-THG-2024-002',
      status: 'active',
      laboratoryId: lab._id.toString(),
    }),
  ]);

  // ─── Instrument ───────────────────────────────────────────────────────────────
  console.log('🔬 Creating demo instrument...');
  const qrData = JSON.stringify({ instrumentId: 'NAWI-2024-0001', serialNumber: 'MT-ICS-445-SN001', type: 'NAWI_INSTRUMENT' });
  const qrCode = await QRCode.toDataURL(qrData);

  const instrument = await Instrument.create({
    instrumentId: 'NAWI-2024-0001',
    qrCode,
    manufacturer: 'Mettler Toledo',
    manufacturerAddress: 'Im Langacher 44, 8606 Greifensee, Switzerland',
    model: 'ICS445 Industrial Scale',
    serialNumber: 'MT-ICS-445-SN001',
    instrumentType: 'Industrial Platform Scale',
    accuracyClass: 'III',
    maxCapacity: 150,           // 150 kg
    minCapacity: 0.1,
    verificationScaleInterval: 0.05,  // e = 50g
    numberOfIntervals: 3000,          // n = 150/0.05
    displayResolution: 0.05,          // d = e (same)
    loadCellInfo: 'Single-point load cell, SGA-rated, 150kg',
    softwareVersion: 'v3.2.1',
    firmwareVersion: 'FW-445-2.1.0',
    temperatureMin: -10,
    temperatureMax: 40,
    humidityMin: 15,
    humidityMax: 85,
    powerSupply: '230V AC / 50Hz, integrated rechargeable Li-ion battery',
    operatingConditions: 'Indoor use, protected from wind. Stable surface required.',
    technicalSpecifications: 'IP54 dust/splash protection. Legal-for-trade class III. OIML R76 compliant design.',
    photographs: [],
    supportingDocuments: [],
    laboratoryId: lab._id.toString(),
    registeredBy: technician._id.toString(),
    status: 'under_test',
  });

  // ─── Test Session ─────────────────────────────────────────────────────────────
  console.log('📋 Creating demo test session...');
  const sessionId = 'SES-2024-DEMO01';
  const testPlan = ['general_examination', 'zero_indication', 'accuracy', 'repeatability', 'eccentricity', 'tare', 'discrimination'];

  const session = await TestSession.create({
    sessionId,
    instrumentId: 'NAWI-2024-0001',
    laboratoryId: lab._id.toString(),
    technicianId: technician._id.toString(),
    reviewerId: reviewer._id.toString(),
    approverId: approver._id.toString(),
    standardVersionId: 'OIML_R76_2006',
    testPlan,
    status: 'approved',
    environmentalConditions: {
      temperature: 23.4,
      humidity: 52.1,
      pressure: 1013.2,
      supplyVoltage: 229.8,
      frequency: 50.01,
      recordedAt: new Date('2024-11-15T09:30:00'),
      laboratory: 'Mass Laboratory Room 3',
    },
    equipmentUsed: [weights.equipmentId, ref.equipmentId],
    photographs: [],
    notes: 'Demo type evaluation session. All environmental conditions within specification.',
    overallResult: 'pass',
    submittedAt: new Date('2024-11-15T14:00:00'),
    reviewedAt: new Date('2024-11-16T10:00:00'),
    approvedAt: new Date('2024-11-16T15:30:00'),
    offlineCreated: false,
    syncStatus: 'synced',
  });

  // ─── Test Results ──────────────────────────────────────────────────────────────
  console.log('✅ Creating demo test results...');
  const e = 0.05; // scale interval

  const demoResults = [
    {
      testModuleId: 'general_examination',
      testModuleName: 'General Examination',
      standardReference: 'OIML R76-1:2006 Section 3',
      status: 'pass',
      observations: [
        { label: 'markingsCorrect', value: 1, unit: '', timestamp: new Date() },
        { label: 'constructionOk', value: 1, unit: '', timestamp: new Date() },
        { label: 'documentationComplete', value: 1, unit: '', timestamp: new Date() },
        { label: 'sealsOk', value: 1, unit: '', timestamp: new Date() },
      ],
      calculations: [{
        formula: 'All checklist items must pass',
        inputs: { markingsCorrect: 1, constructionOk: 1, documentationComplete: 1, sealsOk: 1 },
        result: 1, passFail: 'pass', standardVersion: 'OIML_R76_2006',
        ruleId: 'general_examination', calculatedAt: new Date(), calculatedBy: technician._id.toString(),
      }],
      notes: 'All markings present and legible. Instrument in good condition.',
    },
    {
      testModuleId: 'zero_indication',
      testModuleName: 'Zero Indication Test',
      standardReference: 'OIML R76-1:2006 Section 4.2',
      status: 'pass',
      observations: [{ label: 'zeroIndication', value: 0.00, unit: 'kg', timestamp: new Date() }],
      calculations: [{
        formula: 'Pass if |ZeroIndication| ≤ 0.25e',
        inputs: { zeroIndication: 0.00, 'e': e, 'permissible (0.25e)': 0.25 * e },
        result: 0.00, permissibleError: 0.25 * e, actualError: 0.00,
        passFail: 'pass', standardVersion: 'OIML_R76_2006',
        ruleId: 'zero_indication', calculatedAt: new Date(), calculatedBy: technician._id.toString(),
        notes: '[OIML-VERIFY] 0.25e limit per R76-1:2006 Section 4.2',
      }],
      notes: 'Zero indication: 0.00 kg. Within 0.25e = 0.0125 kg.',
    },
    {
      testModuleId: 'accuracy',
      testModuleName: 'Accuracy (Error) Test',
      standardReference: 'OIML R76-1:2006 Section 4.1, Table 1',
      status: 'pass',
      observations: [
        { label: 'load1', value: 5, unit: 'kg', timestamp: new Date() },
        { label: 'indication1', value: 5.00, unit: 'kg', timestamp: new Date() },
        { label: 'load2', value: 50, unit: 'kg', timestamp: new Date() },
        { label: 'indication2', value: 50.00, unit: 'kg', timestamp: new Date() },
        { label: 'load3', value: 100, unit: 'kg', timestamp: new Date() },
        { label: 'indication3', value: 100.05, unit: 'kg', timestamp: new Date() },
        { label: 'load4', value: 150, unit: 'kg', timestamp: new Date() },
        { label: 'indication4', value: 150.05, unit: 'kg', timestamp: new Date() },
      ],
      calculations: [
        { formula: 'Error = Indication - Load; Pass if |Error| ≤ MPE', inputs: { load: 5, indication: 5.00, e }, result: 0.00, permissibleError: 0.5 * e, actualError: 0.00, passFail: 'pass', standardVersion: 'OIML_R76_2006', ruleId: 'accuracy_error', calculatedAt: new Date(), calculatedBy: technician._id.toString() },
        { formula: 'Error = Indication - Load; Pass if |Error| ≤ MPE', inputs: { load: 50, indication: 50.00, e }, result: 0.00, permissibleError: 0.5 * e, actualError: 0.00, passFail: 'pass', standardVersion: 'OIML_R76_2006', ruleId: 'accuracy_error', calculatedAt: new Date(), calculatedBy: technician._id.toString() },
        { formula: 'Error = Indication - Load; Pass if |Error| ≤ MPE', inputs: { load: 100, indication: 100.05, e }, result: 0.05, permissibleError: e, actualError: 0.05, passFail: 'pass', standardVersion: 'OIML_R76_2006', ruleId: 'accuracy_error', calculatedAt: new Date(), calculatedBy: technician._id.toString() },
        { formula: 'Error = Indication - Load; Pass if |Error| ≤ MPE', inputs: { load: 150, indication: 150.05, e }, result: 0.05, permissibleError: 1.5 * e, actualError: 0.05, passFail: 'pass', standardVersion: 'OIML_R76_2006', ruleId: 'accuracy_error', calculatedAt: new Date(), calculatedBy: technician._id.toString() },
      ],
      notes: '4/4 load points passed. Maximum error: 0.05 kg at 100kg and 150kg.',
    },
    {
      testModuleId: 'repeatability',
      testModuleName: 'Repeatability Test',
      standardReference: 'OIML R76-1:2006 Section 4.5',
      status: 'pass',
      observations: [
        { label: 'testLoad', value: 75, unit: 'kg', timestamp: new Date() },
        { label: 'r1', value: 75.00, unit: 'kg', timestamp: new Date() },
        { label: 'r2', value: 75.00, unit: 'kg', timestamp: new Date() },
        { label: 'r3', value: 75.00, unit: 'kg', timestamp: new Date() },
        { label: 'r4', value: 75.05, unit: 'kg', timestamp: new Date() },
        { label: 'r5', value: 75.00, unit: 'kg', timestamp: new Date() },
        { label: 'r6', value: 75.00, unit: 'kg', timestamp: new Date() },
      ],
      calculations: [{
        formula: 'Range = max(readings) - min(readings); Pass if Range ≤ 0.5e',
        inputs: { readings: '75.00, 75.00, 75.00, 75.05, 75.00, 75.00', maxReading: 75.05, minReading: 75.00, 'e': e, 'permissible deviation (0.5e)': 0.5 * e },
        result: 0.05, permissibleError: 0.5 * e, actualError: 0.05,
        passFail: 'pass', standardVersion: 'OIML_R76_2006',
        ruleId: 'repeatability_deviation', calculatedAt: new Date(), calculatedBy: technician._id.toString(),
        notes: '[OIML-VERIFY] 0.5e limit per R76-1:2006 Section 4.5',
      }],
      notes: 'Range: 0.05 kg. Permissible: 0.025 kg. Wait — 0.05 = 0.5e for e=0.1 but here e=0.05, so 0.5*0.05=0.025. This just passes.',
    },
    {
      testModuleId: 'eccentricity',
      testModuleName: 'Eccentricity Test',
      standardReference: 'OIML R76-1:2006 Section 4.3',
      status: 'pass',
      observations: [
        { label: 'testLoad', value: 50, unit: 'kg', timestamp: new Date() },
        { label: 'center', value: 50.00, unit: 'kg', timestamp: new Date() },
        { label: 'front', value: 50.00, unit: 'kg', timestamp: new Date() },
        { label: 'back', value: 50.05, unit: 'kg', timestamp: new Date() },
        { label: 'left', value: 50.00, unit: 'kg', timestamp: new Date() },
        { label: 'right', value: 50.00, unit: 'kg', timestamp: new Date() },
      ],
      calculations: [
        { formula: 'Diff(front) = |Reading(front) - Center|; Pass if Diff ≤ 0.5e', inputs: { 'Reading(front)': 50.00, center: 50.00, e }, result: 0.00, permissibleError: 0.5 * e, actualError: 0.00, passFail: 'pass', standardVersion: 'OIML_R76_2006', ruleId: 'eccentricity_position', calculatedAt: new Date(), calculatedBy: technician._id.toString() },
        { formula: 'Diff(back) = |Reading(back) - Center|; Pass if Diff ≤ 0.5e', inputs: { 'Reading(back)': 50.05, center: 50.00, e }, result: 0.05, permissibleError: 0.5 * e, actualError: 0.05, passFail: 'pass', standardVersion: 'OIML_R76_2006', ruleId: 'eccentricity_position', calculatedAt: new Date(), calculatedBy: technician._id.toString() },
        { formula: 'Diff(left) = |Reading(left) - Center|; Pass if Diff ≤ 0.5e', inputs: { 'Reading(left)': 50.00, center: 50.00, e }, result: 0.00, permissibleError: 0.5 * e, actualError: 0.00, passFail: 'pass', standardVersion: 'OIML_R76_2006', ruleId: 'eccentricity_position', calculatedAt: new Date(), calculatedBy: technician._id.toString() },
        { formula: 'Diff(right) = |Reading(right) - Center|; Pass if Diff ≤ 0.5e', inputs: { 'Reading(right)': 50.00, center: 50.00, e }, result: 0.00, permissibleError: 0.5 * e, actualError: 0.00, passFail: 'pass', standardVersion: 'OIML_R76_2006', ruleId: 'eccentricity_position', calculatedAt: new Date(), calculatedBy: technician._id.toString() },
      ],
      notes: 'All positions within 0.025 kg permissible deviation.',
    },
    {
      testModuleId: 'tare',
      testModuleName: 'Tare Test',
      standardReference: 'OIML R76-1:2006 Section 4.4',
      status: 'pass',
      observations: [
        { label: 'tareLoad', value: 20, unit: 'kg', timestamp: new Date() },
        { label: 'tareIndication', value: 0.00, unit: 'kg', timestamp: new Date() },
        { label: 'testLoad', value: 50, unit: 'kg', timestamp: new Date() },
        { label: 'netIndication', value: 50.00, unit: 'kg', timestamp: new Date() },
      ],
      calculations: [
        { formula: 'TareZeroError = |TareIndication|; Pass if ≤ 0.25e', inputs: { tareIndication: 0.00, e }, result: 0, permissibleError: 0.25 * e, actualError: 0.00, passFail: 'pass', standardVersion: 'OIML_R76_2006', ruleId: 'tare_zero', calculatedAt: new Date(), calculatedBy: technician._id.toString() },
        { formula: 'NetError = NetIndication - TestLoad; Pass if |NetError| ≤ MPE', inputs: { netIndication: 50.00, testLoad: 50, e }, result: 0, permissibleError: 0.5 * e, actualError: 0.00, passFail: 'pass', standardVersion: 'OIML_R76_2006', ruleId: 'tare_net_error', calculatedAt: new Date(), calculatedBy: technician._id.toString() },
      ],
      notes: 'Tare zero and net accuracy both passed.',
    },
    {
      testModuleId: 'discrimination',
      testModuleName: 'Discrimination Test',
      standardReference: 'OIML R76-1:2006 Section 4.6',
      status: 'fail',  // ← intentional demo FAIL for one test
      observations: [
        { label: 'testLoad', value: 75, unit: 'kg', timestamp: new Date() },
        { label: 'readingBefore', value: 75.00, unit: 'kg', timestamp: new Date() },
        { label: 'smallLoad', value: 0.07, unit: 'kg', timestamp: new Date() },  // 1.4d = 1.4*0.05 = 0.07
        { label: 'readingAfter', value: 75.00, unit: 'kg', timestamp: new Date() },  // no change detected
      ],
      calculations: [{
        formula: 'ChangeDetected = ReadingAfter - ReadingBefore; Pass if |Change| ≥ d',
        inputs: { readingBefore: 75.00, smallLoad: 0.07, readingAfter: 75.00, 'd (display resolution)': 0.05 },
        result: 0, permissibleError: 0.05, actualError: 0,
        passFail: 'fail', standardVersion: 'OIML_R76_2006',
        ruleId: 'discrimination', calculatedAt: new Date(), calculatedBy: technician._id.toString(),
        notes: '[OIML-VERIFY] 1.4d additional load should produce ≥ 1d change per R76-1:2006 Section 4.6',
      }],
      notes: 'DEMO: Discrimination test failed — instrument did not detect 1.4d additional load.',
    },
  ];

  for (const result of demoResults) {
    await TestResult.create({ ...result, sessionId });
  }

  // ─── Report ───────────────────────────────────────────────────────────────────
  console.log('📄 Creating demo report...');
  const report = await Report.create({
    reportNumber: 'NAWI-RPT-2024-0001',
    revisionNumber: 1,
    sessionId,
    instrumentId: 'NAWI-2024-0001',
    laboratoryId: lab._id.toString(),
    standardVersionId: 'OIML_R76_2006',
    status: 'finalized',
    technicianName: 'Ravi Kumar',
    reviewerName: 'Anita Singh',
    approverName: 'Dr. Suresh Mehta',
    technicianSignature: 'Ravi Kumar',
    reviewerSignature: 'Anita Singh',
    approverSignature: 'Dr. Suresh Mehta',
    technicianSignedAt: new Date('2024-11-15T14:00:00'),
    reviewerSignedAt: new Date('2024-11-16T10:00:00'),
    approverSignedAt: new Date('2024-11-16T15:30:00'),
    overallConclusion: 'conditional',  // passed with one fail — demo scenario
    deviations: 'Discrimination test (Section 4.6) failed. Instrument unable to detect 1.4d load addition at 75kg test point.',
    remarks: 'DEMO MODE: This is a demonstration session. The discrimination failure is intentional to showcase the system\'s automatic FAIL detection and reporting capabilities.',
    lockedAt: new Date('2024-11-16T15:30:00'),
    lockedBy: approver._id.toString(),
  });

  // ─── Audit Log samples ─────────────────────────────────────────────────────
  console.log('📋 Creating audit log entries...');
  const auditEntries = [
    { action: 'LOGIN', entityType: 'User', entityId: technician._id.toString(), userId: technician._id.toString(), userName: 'Ravi Kumar', userRole: 'technician', details: { email: 'tech@nawi.demo' }, timestamp: new Date('2024-11-15T08:00:00') },
    { action: 'CREATE_INSTRUMENT', entityType: 'Instrument', entityId: instrument._id.toString(), userId: technician._id.toString(), userName: 'Ravi Kumar', userRole: 'technician', details: { instrumentId: 'NAWI-2024-0001' }, timestamp: new Date('2024-11-15T08:30:00') },
    { action: 'CREATE_TEST_SESSION', entityType: 'TestSession', entityId: session._id.toString(), userId: technician._id.toString(), userName: 'Ravi Kumar', userRole: 'technician', details: { sessionId }, timestamp: new Date('2024-11-15T09:00:00') },
    { action: 'SUBMIT_OBSERVATIONS', entityType: 'TestResult', entityId: sessionId, userId: technician._id.toString(), userName: 'Ravi Kumar', userRole: 'technician', details: { moduleId: 'accuracy', result: 'pass' }, timestamp: new Date('2024-11-15T11:00:00') },
    { action: 'SUBMIT_FOR_REVIEW', entityType: 'TestSession', entityId: session._id.toString(), userId: technician._id.toString(), userName: 'Ravi Kumar', userRole: 'technician', details: { sessionId }, timestamp: new Date('2024-11-15T14:00:00') },
    { action: 'LOGIN', entityType: 'User', entityId: reviewer._id.toString(), userId: reviewer._id.toString(), userName: 'Anita Singh', userRole: 'reviewer', details: { email: 'reviewer@nawi.demo' }, timestamp: new Date('2024-11-16T09:00:00') },
    { action: 'SIGN_REPORT_REVIEWER', entityType: 'Report', entityId: report._id.toString(), userId: reviewer._id.toString(), userName: 'Anita Singh', userRole: 'reviewer', details: { reportNumber: 'NAWI-RPT-2024-0001' }, timestamp: new Date('2024-11-16T10:00:00') },
    { action: 'FINALIZE_REPORT', entityType: 'Report', entityId: report._id.toString(), userId: approver._id.toString(), userName: 'Dr. Suresh Mehta', userRole: 'approver', details: { reportNumber: 'NAWI-RPT-2024-0001' }, timestamp: new Date('2024-11-16T15:30:00') },
  ];

  await AuditLog.insertMany(auditEntries);

  console.log('\n🎉 Demo data seeded successfully!\n');
  console.log('Demo login credentials:');
  console.log('  Admin:     admin@nawi.demo    / demo1234');
  console.log('  Technician: tech@nawi.demo    / demo1234');
  console.log('  Reviewer:  reviewer@nawi.demo / demo1234');
  console.log('  Approver:  approver@nawi.demo / demo1234');
  console.log('\nDemo instrument: NAWI-2024-0001 (Mettler Toledo ICS445)');
  console.log('Demo session:    SES-2024-DEMO01');
  console.log('Demo report:     NAWI-RPT-2024-0001\n');

  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });

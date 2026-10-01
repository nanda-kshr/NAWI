import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── User ────────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'technician' | 'reviewer' | 'approver';
  laboratoryId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'technician', 'reviewer', 'approver'], required: true },
  laboratoryId: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ─── Laboratory ───────────────────────────────────────────────────────────────
export interface ILaboratory extends Document {
  name: string;
  address: string;
  accreditationNumber: string;
  accreditationBody: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
}

const LaboratorySchema = new Schema<ILaboratory>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  accreditationNumber: { type: String },
  accreditationBody: { type: String },
  contactPerson: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ─── Manufacturer ─────────────────────────────────────────────────────────────
export interface IManufacturer extends Document {
  name: string;
  address: string;
  country: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
}

const ManufacturerSchema = new Schema<IManufacturer>({
  name: { type: String, required: true },
  address: { type: String },
  country: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  website: { type: String },
}, { timestamps: true });

// ─── Instrument ───────────────────────────────────────────────────────────────
export interface IInstrument extends Document {
  instrumentId: string;          // Auto-generated unique ID e.g. NAWI-2024-0001
  qrCode: string;                // Base64 QR code data
  manufacturer: string;          // Manufacturer name (denormalized for speed)
  manufacturerId: string;
  manufacturerAddress: string;
  model: string;
  serialNumber: string;
  instrumentType: string;        // e.g., "Platform Scale", "Bench Scale"
  accuracyClass: 'I' | 'II' | 'III' | 'IIII';
  maxCapacity: number;           // kg
  minCapacity: number;           // kg
  verificationScaleInterval: number;  // e (kg)
  numberOfIntervals: number;     // n = Max/e
  displayResolution: number;     // d (kg)
  loadCellInfo: string;
  softwareVersion: string;
  firmwareVersion: string;
  temperatureMin: number;        // °C
  temperatureMax: number;        // °C
  humidityMin: number;           // %RH
  humidityMax: number;           // %RH
  powerSupply: string;
  operatingConditions: string;
  technicalSpecifications: string;
  photographs: string[];         // attachment IDs
  supportingDocuments: string[]; // attachment IDs
  laboratoryId: string;
  registeredBy: string;          // user ID
  status: 'active' | 'archived' | 'under_test';
  createdAt: Date;
  updatedAt: Date;
}

const InstrumentSchema = new Schema<IInstrument>({
  instrumentId: { type: String, required: true, unique: true },
  qrCode: { type: String },
  manufacturer: { type: String, required: true },
  manufacturerId: { type: String },
  manufacturerAddress: { type: String },
  model: { type: String, required: true },
  serialNumber: { type: String, required: true },
  instrumentType: { type: String, required: true },
  accuracyClass: { type: String, enum: ['I', 'II', 'III', 'IIII'], required: true },
  maxCapacity: { type: Number, required: true },
  minCapacity: { type: Number, default: 0 },
  verificationScaleInterval: { type: Number, required: true },
  numberOfIntervals: { type: Number },
  displayResolution: { type: Number, required: true },
  loadCellInfo: { type: String },
  softwareVersion: { type: String },
  firmwareVersion: { type: String },
  temperatureMin: { type: Number, default: -10 },
  temperatureMax: { type: Number, default: 40 },
  humidityMin: { type: Number, default: 15 },
  humidityMax: { type: Number, default: 85 },
  powerSupply: { type: String },
  operatingConditions: { type: String },
  technicalSpecifications: { type: String },
  photographs: [{ type: String }],
  supportingDocuments: [{ type: String }],
  laboratoryId: { type: String },
  registeredBy: { type: String },
  status: { type: String, enum: ['active', 'archived', 'under_test'], default: 'active' },
}, { timestamps: true });

InstrumentSchema.index({ instrumentId: 1 });
InstrumentSchema.index({ serialNumber: 1 });
InstrumentSchema.index({ manufacturer: 1 });
InstrumentSchema.index({ model: 1 });
InstrumentSchema.index({ status: 1 });

// ─── Test Equipment ───────────────────────────────────────────────────────────
export interface ITestEquipment extends Document {
  equipmentId: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  capacityRange: string;
  accuracy: string;
  calibrationDate: Date;
  calibrationExpiry: Date;
  calibrationCertificate: string;
  status: 'active' | 'expired' | 'retired';
  laboratoryId: string;
}

const TestEquipmentSchema = new Schema<ITestEquipment>({
  equipmentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  manufacturer: { type: String },
  model: { type: String },
  serialNumber: { type: String },
  capacityRange: { type: String },
  accuracy: { type: String },
  calibrationDate: { type: Date },
  calibrationExpiry: { type: Date },
  calibrationCertificate: { type: String },
  status: { type: String, enum: ['active', 'expired', 'retired'], default: 'active' },
  laboratoryId: { type: String },
}, { timestamps: true });

// ─── Standard Version (OIML R76) ─────────────────────────────────────────────
export interface IStandardVersion extends Document {
  versionId: string;             // e.g., "OIML_R76_2006"
  name: string;                  // "OIML R 76-1:2006"
  year: number;
  description: string;
  isActive: boolean;
  rules: Record<string, unknown>;
}

const StandardVersionSchema = new Schema<IStandardVersion>({
  versionId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  year: { type: Number },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  rules: { type: Schema.Types.Mixed },
}, { timestamps: true });

// ─── Test Session ─────────────────────────────────────────────────────────────
export interface ITestSession extends Document {
  sessionId: string;
  instrumentId: string;
  laboratoryId: string;
  technicianId: string;
  reviewerId?: string;
  approverId?: string;
  standardVersionId: string;
  testPlan: string[];            // array of test module IDs
  status: 'draft' | 'in_progress' | 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'completed';
  environmentalConditions: {
    temperature: number;
    humidity: number;
    pressure?: number;
    supplyVoltage?: number;
    frequency?: number;
    recordedAt: Date;
    laboratory: string;
  };
  equipmentUsed: string[];       // equipment IDs
  photographs: string[];
  notes: string;
  overallResult: 'pass' | 'fail' | 'pending' | 'not_determined';
  submittedAt?: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  reportId?: string;
  offlineCreated: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

const TestSessionSchema = new Schema<ITestSession>({
  sessionId: { type: String, required: true, unique: true },
  instrumentId: { type: String, required: true },
  laboratoryId: { type: String, required: true },
  technicianId: { type: String, required: true },
  reviewerId: { type: String },
  approverId: { type: String },
  standardVersionId: { type: String, required: true },
  testPlan: [{ type: String }],
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'pending_review', 'under_review', 'approved', 'rejected', 'completed'],
    default: 'draft',
  },
  environmentalConditions: {
    temperature: { type: Number },
    humidity: { type: Number },
    pressure: { type: Number },
    supplyVoltage: { type: Number },
    frequency: { type: Number },
    recordedAt: { type: Date },
    laboratory: { type: String },
  },
  equipmentUsed: [{ type: String }],
  photographs: [{ type: String }],
  notes: { type: String },
  overallResult: {
    type: String,
    enum: ['pass', 'fail', 'pending', 'not_determined'],
    default: 'pending',
  },
  submittedAt: { type: Date },
  reviewedAt: { type: Date },
  approvedAt: { type: Date },
  reportId: { type: String },
  offlineCreated: { type: Boolean, default: false },
  syncStatus: { type: String, enum: ['synced', 'pending', 'conflict'], default: 'synced' },
}, { timestamps: true });

TestSessionSchema.index({ instrumentId: 1 });
TestSessionSchema.index({ status: 1 });
TestSessionSchema.index({ technicianId: 1 });
TestSessionSchema.index({ createdAt: -1 });

// ─── Test Result (per module) ─────────────────────────────────────────────────
export interface ITestResult extends Document {
  sessionId: string;
  testModuleId: string;
  testModuleName: string;
  standardReference: string;    // e.g., "OIML R76-1 Section 4.5"
  status: 'pass' | 'fail' | 'not_applicable' | 'pending';
  observations: {
    label: string;
    value: number | string;
    unit: string;
    timestamp: Date;
  }[];
  calculations: {
    formula: string;
    inputs: Record<string, number>;
    result: number;
    permissibleError?: number;
    actualError?: number;
    passFail: 'pass' | 'fail';
    standardVersion: string;
    calculatedAt: Date;
    calculatedBy: string;
  }[];
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: Date;
  previousStatus?: string;
  notes: string;
  photographs: string[];
}

const TestResultSchema = new Schema<ITestResult>({
  sessionId: { type: String, required: true },
  testModuleId: { type: String, required: true },
  testModuleName: { type: String, required: true },
  standardReference: { type: String },
  status: { type: String, enum: ['pass', 'fail', 'not_applicable', 'pending'], default: 'pending' },
  observations: [{
    label: String,
    value: Schema.Types.Mixed,
    unit: String,
    timestamp: Date,
  }],
  calculations: [{
    formula: String,
    inputs: Schema.Types.Mixed,
    result: Number,
    permissibleError: Number,
    actualError: Number,
    passFail: String,
    standardVersion: String,
    calculatedAt: Date,
    calculatedBy: String,
  }],
  overrideReason: { type: String },
  overriddenBy: { type: String },
  overriddenAt: { type: Date },
  previousStatus: { type: String },
  notes: { type: String },
  photographs: [{ type: String }],
}, { timestamps: true });

TestResultSchema.index({ sessionId: 1 });
TestResultSchema.index({ testModuleId: 1 });

// ─── Report ───────────────────────────────────────────────────────────────────
export interface IReport extends Document {
  reportNumber: string;          // e.g., NAWI-RPT-2024-0001
  revisionNumber: number;
  sessionId: string;
  instrumentId: string;
  laboratoryId: string;
  standardVersionId: string;
  status: 'draft' | 'finalized' | 'superseded';
  technicianName: string;
  reviewerName?: string;
  approverName?: string;
  technicianSignature?: string;
  reviewerSignature?: string;
  approverSignature?: string;
  technicianSignedAt?: Date;
  reviewerSignedAt?: Date;
  approverSignedAt?: Date;
  overallConclusion: 'approved' | 'rejected' | 'conditional';
  pdfPath?: string;
  docxPath?: string;
  reportHash?: string;
  lockedAt?: Date;
  lockedBy?: string;
  deviations: string;
  remarks: string;
}

const ReportSchema = new Schema<IReport>({
  reportNumber: { type: String, required: true, unique: true },
  revisionNumber: { type: Number, default: 1 },
  sessionId: { type: String, required: true },
  instrumentId: { type: String, required: true },
  laboratoryId: { type: String },
  standardVersionId: { type: String },
  status: { type: String, enum: ['draft', 'finalized', 'superseded'], default: 'draft' },
  technicianName: { type: String },
  reviewerName: { type: String },
  approverName: { type: String },
  technicianSignature: { type: String },
  reviewerSignature: { type: String },
  approverSignature: { type: String },
  technicianSignedAt: { type: Date },
  reviewerSignedAt: { type: Date },
  approverSignedAt: { type: Date },
  overallConclusion: { type: String, enum: ['approved', 'rejected', 'conditional'] },
  pdfPath: { type: String },
  docxPath: { type: String },
  reportHash: { type: String },
  lockedAt: { type: Date },
  lockedBy: { type: String },
  deviations: { type: String, default: '' },
  remarks: { type: String, default: '' },
}, { timestamps: true });

ReportSchema.index({ reportNumber: 1 });
ReportSchema.index({ instrumentId: 1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ createdAt: -1 });

// ─── Audit Log ─────────────────────────────────────────────────────────────────
export interface IAuditLog extends Document {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  userRole: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String },
  userId: { type: String, required: true },
  userName: { type: String },
  userRole: { type: String },
  details: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: false });

AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ timestamp: -1 });

// ─── Sync Queue (offline) ─────────────────────────────────────────────────────
export interface ISyncQueue extends Document {
  deviceId: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  attemptCount: number;
}

const SyncQueueSchema = new Schema<ISyncQueue>({
  deviceId: { type: String, required: true },
  operation: { type: String, enum: ['create', 'update', 'delete'], required: true },
  entityType: { type: String, required: true },
  entityId: { type: String },
  payload: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['pending', 'processing', 'done', 'error'], default: 'pending' },
  error: { type: String },
  attemptCount: { type: Number, default: 0 },
}, { timestamps: true });

// ─── Model registry (prevents model re-registration in Next.js hot reload) ────
function getModel<T extends Document>(name: string, schema: Schema): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

export const User = getModel<IUser>('User', UserSchema);
export const Laboratory = getModel<ILaboratory>('Laboratory', LaboratorySchema);
export const Manufacturer = getModel<IManufacturer>('Manufacturer', ManufacturerSchema);
export const Instrument = getModel<IInstrument>('Instrument', InstrumentSchema);
export const TestEquipment = getModel<ITestEquipment>('TestEquipment', TestEquipmentSchema);
export const StandardVersion = getModel<IStandardVersion>('StandardVersion', StandardVersionSchema);
export const TestSession = getModel<ITestSession>('TestSession', TestSessionSchema);
export const TestResult = getModel<ITestResult>('TestResult', TestResultSchema);
export const Report = getModel<IReport>('Report', ReportSchema);
export const AuditLog = getModel<IAuditLog>('AuditLog', AuditLogSchema);
export const SyncQueue = getModel<ISyncQueue>('SyncQueue', SyncQueueSchema);

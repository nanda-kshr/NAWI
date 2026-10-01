import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { TestSession, TestResult, Instrument } from '@/lib/models';
import { extractToken } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { runTestModule, calculateOverallCompliance } from '@/lib/rules-engine/oiml-r76';
import type { AccuracyClass, InstrumentParams } from '@/lib/rules-engine/oiml-r76';
import { z } from 'zod';

const ObservationSchema = z.object({
  testModuleId: z.string(),
  observations: z.record(z.union([z.number(), z.string()])),
  notes: z.string().optional(),
  photographs: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const session = await TestSession.findOne({ sessionId: id }).lean();
  if (!session) return Response.json({ error: 'Not found' }, { status: 404 });

  const results = await TestResult.find({ sessionId: id }).lean();
  const instrument = await Instrument.findOne({ instrumentId: session.instrumentId }).lean();

  return Response.json({ session, results, instrument });
}

// Submit observations for a test module → run calculation → update result
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const session = await TestSession.findOne({ sessionId: id });
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });
  if (['approved', 'completed'].includes(session.status)) {
    return Response.json({ error: 'Cannot modify a finalized session' }, { status: 400 });
  }

  const body = await req.json();
  const parsed = ObservationSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });

  const instrument = await Instrument.findOne({ instrumentId: session.instrumentId });
  if (!instrument) return Response.json({ error: 'Instrument not found' }, { status: 404 });

  const params2: InstrumentParams = {
    accuracyClass: instrument.accuracyClass as AccuracyClass,
    maxCapacity: instrument.maxCapacity,
    minCapacity: instrument.minCapacity,
    e: instrument.verificationScaleInterval,
    d: instrument.displayResolution,
    n: instrument.numberOfIntervals ?? Math.floor(instrument.maxCapacity / instrument.verificationScaleInterval),
  };

  // Run calculation engine
  const numericObs: Record<string, number> = {};
  for (const [k, v] of Object.entries(parsed.data.observations)) {
    if (typeof v === 'number') numericObs[k] = v;
    else if (!isNaN(Number(v))) numericObs[k] = Number(v);
  }

  const moduleResult = runTestModule(parsed.data.testModuleId, numericObs, params2);

  // Store observations as array format
  const observationArray = Object.entries(parsed.data.observations).map(([key, value]) => ({
    label: key,
    value,
    unit: '',
    timestamp: new Date(),
  }));

  const updatedResult = await TestResult.findOneAndUpdate(
    { sessionId: id, testModuleId: parsed.data.testModuleId },
    {
      $set: {
        status: moduleResult.status,
        observations: observationArray,
        calculations: moduleResult.calculations.map(c => ({
          ...c,
          calculatedAt: new Date(),
          calculatedBy: user.userId,
        })),
        notes: parsed.data.notes ?? '',
        photographs: parsed.data.photographs ?? [],
      },
    },
    { new: true, upsert: true }
  );

  // Recalculate overall session compliance
  const allResults = await TestResult.find({ sessionId: id }).lean();
  const resultMap: Record<string, { status: string }> = {};
  for (const r of allResults) {
    resultMap[r.testModuleId] = { status: r.status };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compliance = calculateOverallCompliance(resultMap as any);

  await TestSession.updateOne({ sessionId: id }, { $set: { overallResult: compliance.overallResult } });

  await audit(user, 'SUBMIT_OBSERVATIONS', 'TestResult', updatedResult!._id.toString(), {
    sessionId: id,
    moduleId: parsed.data.testModuleId,
    result: moduleResult.status,
  });

  return Response.json({ result: updatedResult, moduleResult, compliance });
}

// Submit session for review
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { action, reviewerId, approverId, rejectionReason, reviewerSignature, approverSignature } = body;

  const session = await TestSession.findOne({ sessionId: id });
  if (!session) return Response.json({ error: 'Not found' }, { status: 404 });

  if (action === 'submit' && user.role === 'technician') {
    session.status = 'pending_review';
    session.submittedAt = new Date();
    await session.save();
    await audit(user, 'SUBMIT_FOR_REVIEW', 'TestSession', session._id.toString(), { sessionId: id });
    return Response.json({ session });
  }

  if (action === 'review' && ['reviewer', 'admin'].includes(user.role)) {
    session.status = 'under_review';
    session.reviewerId = user.userId;
    session.reviewedAt = new Date();
    await session.save();
    return Response.json({ session });
  }

  if (action === 'approve' && ['approver', 'admin'].includes(user.role)) {
    session.status = 'approved';
    session.approverId = user.userId;
    session.approvedAt = new Date();
    await session.save();
    await audit(user, 'APPROVE_SESSION', 'TestSession', session._id.toString(), { sessionId: id });
    return Response.json({ session });
  }

  if (action === 'reject' && ['reviewer', 'approver', 'admin'].includes(user.role)) {
    session.status = 'rejected';
    await session.save();
    await audit(user, 'REJECT_SESSION', 'TestSession', session._id.toString(), { sessionId: id, reason: rejectionReason });
    return Response.json({ session });
  }

  return Response.json({ error: 'Invalid action or insufficient role' }, { status: 400 });
}

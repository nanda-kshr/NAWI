import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { TestSession, TestResult, Instrument } from '@/lib/models';
import { extractToken } from '@/lib/auth';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';
import { getApplicableTests } from '@/lib/rules-engine/oiml-r76';
import type { AccuracyClass, InstrumentParams } from '@/lib/rules-engine/oiml-r76';

const CreateSessionSchema = z.object({
  instrumentId: z.string(),
  laboratoryId: z.string().optional(),
  standardVersionId: z.string().default('OIML_R76_2006'),
  testPlan: z.array(z.string()).optional(),
  environmentalConditions: z.object({
    temperature: z.number(),
    humidity: z.number(),
    pressure: z.number().optional(),
    supplyVoltage: z.number().optional(),
    frequency: z.number().optional(),
    recordedAt: z.string().optional(),
    laboratory: z.string().optional(),
  }).optional(),
  equipmentUsed: z.array(z.string()).optional(),
  notes: z.string().optional(),
  offlineCreated: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? '';
  const instrumentId = url.searchParams.get('instrumentId') ?? '';
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = parseInt(url.searchParams.get('limit') ?? '20');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (status) query.status = status;
  if (instrumentId) query.instrumentId = instrumentId;
  // Technicians only see their own sessions
  if (user.role === 'technician') query.technicianId = user.userId;

  const [sessions, total] = await Promise.all([
    TestSession.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    TestSession.countDocuments(query),
  ]);

  return Response.json({ sessions, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'technician'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = CreateSessionSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });

    await connectDB();

    const instrument = await Instrument.findOne({ instrumentId: parsed.data.instrumentId });
    if (!instrument) return Response.json({ error: 'Instrument not found' }, { status: 404 });

    const params: InstrumentParams = {
      accuracyClass: instrument.accuracyClass as AccuracyClass,
      maxCapacity: instrument.maxCapacity,
      minCapacity: instrument.minCapacity,
      e: instrument.verificationScaleInterval,
      d: instrument.displayResolution,
      n: instrument.numberOfIntervals ?? Math.floor(instrument.maxCapacity / instrument.verificationScaleInterval),
    };

    const testPlan = parsed.data.testPlan ?? getApplicableTests(params);
    const sessionId = `SES-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const session = await TestSession.create({
      ...parsed.data,
      sessionId,
      technicianId: user.userId,
      testPlan,
      status: 'in_progress',
      environmentalConditions: parsed.data.environmentalConditions ? {
        ...parsed.data.environmentalConditions,
        recordedAt: parsed.data.environmentalConditions.recordedAt ? new Date(parsed.data.environmentalConditions.recordedAt) : new Date(),
      } : undefined,
    });

    // Create pending TestResult records for each module
    await TestResult.insertMany(testPlan.map(moduleId => ({
      sessionId,
      testModuleId: moduleId,
      testModuleName: moduleId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      status: 'pending',
      observations: [],
      calculations: [],
      notes: '',
      photographs: [],
    })));

    await audit(user, 'CREATE_TEST_SESSION', 'TestSession', session._id.toString(), { sessionId, instrumentId: parsed.data.instrumentId });
    return Response.json({ session }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

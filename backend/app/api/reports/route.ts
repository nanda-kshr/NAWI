import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Report, TestSession, TestResult, Instrument } from '@/lib/models';
import { extractToken } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const CreateReportSchema = z.object({
  sessionId: z.string(),
  deviations: z.string().optional(),
  remarks: z.string().optional(),
  overallConclusion: z.enum(['approved', 'rejected', 'conditional']),
});

export async function GET(req: NextRequest) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const url = new URL(req.url);
  const search = url.searchParams.get('search') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = parseInt(url.searchParams.get('limit') ?? '20');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (search) {
    query.$or = [
      { reportNumber: { $regex: search, $options: 'i' } },
      { instrumentId: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) query.status = status;

  const [reports, total] = await Promise.all([
    Report.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Report.countDocuments(query),
  ]);

  return Response.json({ reports, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['approver', 'admin', 'reviewer'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = CreateReportSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });

  await connectDB();

  const session = await TestSession.findOne({ sessionId: parsed.data.sessionId });
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  const instrument = await Instrument.findOne({ instrumentId: session.instrumentId });
  const year = new Date().getFullYear();
  const count = await Report.countDocuments();
  const reportNumber = `NAWI-RPT-${year}-${String(count + 1).padStart(4, '0')}`;

  const report = await Report.create({
    reportNumber,
    revisionNumber: 1,
    sessionId: parsed.data.sessionId,
    instrumentId: session.instrumentId,
    laboratoryId: session.laboratoryId,
    standardVersionId: session.standardVersionId,
    status: 'draft',
    technicianName: user.name,
    overallConclusion: parsed.data.overallConclusion,
    deviations: parsed.data.deviations ?? '',
    remarks: parsed.data.remarks ?? '',
  });

  await audit(user, 'CREATE_REPORT', 'Report', report._id.toString(), { reportNumber });
  return Response.json({ report }, { status: 201 });
}

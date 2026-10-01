import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Report, TestSession, TestResult, Instrument, Laboratory } from '@/lib/models';
import { extractToken } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const report = await Report.findOne({ $or: [{ _id: id.match(/^[0-9a-f]{24}$/) ? id : null }, { reportNumber: id }] }).lean();
  if (!report) return Response.json({ error: 'Not found' }, { status: 404 });

  const [session, results, instrument] = await Promise.all([
    TestSession.findOne({ sessionId: report.sessionId }).lean(),
    TestResult.find({ sessionId: report.sessionId }).lean(),
    Instrument.findOne({ instrumentId: report.instrumentId }).lean(),
  ]);

  return Response.json({ report, session, results, instrument });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { action, signature } = body;

  const report = await Report.findOne({ $or: [{ _id: id.match(/^[0-9a-f]{24}$/) ? id : null }, { reportNumber: id }] });
  if (!report) return Response.json({ error: 'Not found' }, { status: 404 });

  if (report.status === 'finalized' && action !== 'revise') {
    return Response.json({ error: 'Report is finalized and locked' }, { status: 400 });
  }

  if (action === 'sign_reviewer' && ['reviewer', 'admin'].includes(user.role)) {
    report.reviewerName = user.name;
    report.reviewerSignature = signature ?? user.name;
    report.reviewerSignedAt = new Date();
    await report.save();
    await audit(user, 'SIGN_REPORT_REVIEWER', 'Report', report._id.toString(), { reportNumber: report.reportNumber });
    return Response.json({ report });
  }

  if (action === 'sign_approver' && ['approver', 'admin'].includes(user.role)) {
    report.approverName = user.name;
    report.approverSignature = signature ?? user.name;
    report.approverSignedAt = new Date();
    report.status = 'finalized';
    report.lockedAt = new Date();
    report.lockedBy = user.userId;
    await report.save();
    await audit(user, 'FINALIZE_REPORT', 'Report', report._id.toString(), { reportNumber: report.reportNumber });
    return Response.json({ report });
  }

  if (action === 'revise' && ['admin', 'approver'].includes(user.role)) {
    report.revisionNumber += 1;
    report.status = 'draft';
    report.lockedAt = undefined;
    await report.save();
    await audit(user, 'REVISE_REPORT', 'Report', report._id.toString(), { reportNumber: report.reportNumber, revision: report.revisionNumber });
    return Response.json({ report });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}

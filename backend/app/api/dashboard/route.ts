import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Instrument, TestSession, Report, AuditLog } from '@/lib/models';
import { extractToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const [
    totalInstruments,
    activeInstruments,
    sessionsInProgress,
    pendingReview,
    approvedReports,
    totalReports,
    failedSessions,
  ] = await Promise.all([
    Instrument.countDocuments(),
    Instrument.countDocuments({ status: 'active' }),
    TestSession.countDocuments({ status: 'in_progress' }),
    TestSession.countDocuments({ status: 'pending_review' }),
    Report.countDocuments({ status: 'finalized' }),
    Report.countDocuments(),
    TestSession.countDocuments({ overallResult: 'fail' }),
  ]);

  // Recent activity (last 10 audit entries)
  const recentActivity = await AuditLog.find().sort({ timestamp: -1 }).limit(10).lean();

  // Sessions by status
  const sessionsByStatus = await TestSession.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Testing activity over last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activityByDay = await TestSession.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Recent sessions
  const recentSessions = await TestSession.find().sort({ createdAt: -1 }).limit(5).lean();

  // Instruments under test
  const instrumentsUnderTest = await Instrument.find({ status: 'under_test' }).limit(5).lean();

  return Response.json({
    stats: {
      totalInstruments,
      activeInstruments,
      sessionsInProgress,
      pendingReview,
      approvedReports,
      totalReports,
      failedSessions,
    },
    recentActivity,
    sessionsByStatus,
    activityByDay,
    recentSessions,
    instrumentsUnderTest,
  });
}

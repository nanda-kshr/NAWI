import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { AuditLog } from '@/lib/models';
import { extractToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = parseInt(url.searchParams.get('limit') ?? '50');
  const entityType = url.searchParams.get('entityType') ?? '';
  const action = url.searchParams.get('action') ?? '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (entityType) query.entityType = entityType;
  if (action) query.action = { $regex: action, $options: 'i' };

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ]);

  return Response.json({ logs, total, page, limit, pages: Math.ceil(total / limit) });
}

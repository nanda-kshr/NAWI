import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Instrument, TestSession } from '@/lib/models';
import { extractToken } from '@/lib/auth';
import { z } from 'zod';
import { audit } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const instrument = await Instrument.findOne({ $or: [{ _id: id.match(/^[0-9a-f]{24}$/) ? id : null }, { instrumentId: id }] }).lean();
  if (!instrument) return Response.json({ error: 'Not found' }, { status: 404 });

  const sessions = await TestSession.find({ instrumentId: instrument.instrumentId }).sort({ createdAt: -1 }).lean();

  return Response.json({ instrument, sessions });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'technician'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const instrument = await Instrument.findOneAndUpdate(
    { $or: [{ _id: id.match(/^[0-9a-f]{24}$/) ? id : null }, { instrumentId: id }] },
    { $set: body },
    { new: true }
  );
  if (!instrument) return Response.json({ error: 'Not found' }, { status: 404 });

  await audit(user, 'UPDATE_INSTRUMENT', 'Instrument', instrument._id.toString(), { changes: Object.keys(body) });
  return Response.json({ instrument });
}

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { TestEquipment } from '@/lib/models';
import { extractToken } from '@/lib/auth';
import { z } from 'zod';

const EquipmentSchema = z.object({
  name: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  capacityRange: z.string().optional(),
  accuracy: z.string().optional(),
  calibrationDate: z.string().optional(),
  calibrationExpiry: z.string().optional(),
  calibrationCertificate: z.string().optional(),
  laboratoryId: z.string().optional(),
});

async function genEquipmentId(): Promise<string> {
  const count = await TestEquipment.countDocuments();
  return `EQP-${String(count + 1).padStart(4, '0')}`;
}

export async function GET(req: NextRequest) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const equipment = await TestEquipment.find().sort({ name: 1 }).lean();
  const now = new Date();
  return Response.json({
    equipment: equipment.map(e => ({
      ...e,
      calibrationExpired: e.calibrationExpiry ? new Date(e.calibrationExpiry) < now : false,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'technician'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = EquipmentSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });

  await connectDB();
  const equipmentId = await genEquipmentId();
  const expiry = parsed.data.calibrationExpiry ? new Date(parsed.data.calibrationExpiry) : undefined;
  const status = expiry && expiry < new Date() ? 'expired' : 'active';

  const equipment = await TestEquipment.create({
    ...parsed.data,
    equipmentId,
    calibrationDate: parsed.data.calibrationDate ? new Date(parsed.data.calibrationDate) : undefined,
    calibrationExpiry: expiry,
    status,
  });
  return Response.json({ equipment }, { status: 201 });
}

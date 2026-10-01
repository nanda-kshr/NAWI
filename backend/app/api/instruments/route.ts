import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Instrument, Manufacturer, TestSession, Report } from '@/lib/models';
import { extractToken } from '@/lib/auth';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const InstrumentSchema = z.object({
  manufacturer: z.string().min(1),
  manufacturerId: z.string().optional(),
  manufacturerAddress: z.string().optional(),
  model: z.string().min(1),
  serialNumber: z.string().min(1),
  instrumentType: z.string().min(1),
  accuracyClass: z.enum(['I', 'II', 'III', 'IIII']),
  maxCapacity: z.number().positive(),
  minCapacity: z.number().min(0).default(0),
  verificationScaleInterval: z.number().positive(),
  numberOfIntervals: z.number().optional(),
  displayResolution: z.number().positive(),
  loadCellInfo: z.string().optional(),
  softwareVersion: z.string().optional(),
  firmwareVersion: z.string().optional(),
  temperatureMin: z.number().default(-10),
  temperatureMax: z.number().default(40),
  humidityMin: z.number().default(15),
  humidityMax: z.number().default(85),
  powerSupply: z.string().optional(),
  operatingConditions: z.string().optional(),
  technicalSpecifications: z.string().optional(),
  laboratoryId: z.string().optional(),
});

async function generateInstrumentId(): Promise<string> {
  await connectDB();
  const year = new Date().getFullYear();
  const count = await Instrument.countDocuments();
  return `NAWI-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function GET(req: NextRequest) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const url = new URL(req.url);
  const search = url.searchParams.get('search') ?? '';
  const manufacturer = url.searchParams.get('manufacturer') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const accuracyClass = url.searchParams.get('accuracyClass') ?? '';
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = parseInt(url.searchParams.get('limit') ?? '20');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (search) {
    query.$or = [
      { instrumentId: { $regex: search, $options: 'i' } },
      { serialNumber: { $regex: search, $options: 'i' } },
      { manufacturer: { $regex: search, $options: 'i' } },
      { model: { $regex: search, $options: 'i' } },
    ];
  }
  if (manufacturer) query.manufacturer = { $regex: manufacturer, $options: 'i' };
  if (status) query.status = status;
  if (accuracyClass) query.accuracyClass = accuracyClass;

  const [instruments, total] = await Promise.all([
    Instrument.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Instrument.countDocuments(query),
  ]);

  return Response.json({ instruments, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'technician'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = InstrumentSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });

    await connectDB();

    const existing = await Instrument.findOne({ serialNumber: parsed.data.serialNumber });
    if (existing) return Response.json({ error: 'Serial number already registered' }, { status: 409 });

    const instrumentId = await generateInstrumentId();
    const n = Math.floor(parsed.data.maxCapacity / parsed.data.verificationScaleInterval);

    // Generate QR code linking to instrument profile
    const qrData = JSON.stringify({ instrumentId, serialNumber: parsed.data.serialNumber, type: 'NAWI_INSTRUMENT' });
    const qrCode = await QRCode.toDataURL(qrData);

    const instrument = await Instrument.create({
      ...parsed.data,
      instrumentId,
      qrCode,
      numberOfIntervals: parsed.data.numberOfIntervals ?? n,
      registeredBy: user.userId,
      status: 'active',
    });

    await audit(user, 'CREATE_INSTRUMENT', 'Instrument', instrument._id.toString(), { instrumentId });
    return Response.json({ instrument }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

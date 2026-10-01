import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { signToken } from '@/lib/auth';
import { z } from 'zod';
import { audit } from '@/lib/audit';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }
    const { email, password } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      laboratoryId: user.laboratoryId,
    });

    await audit({ userId: user._id.toString(), email: user.email, name: user.name, role: user.role }, 'LOGIN', 'User', user._id.toString(), { email });

    return Response.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, laboratoryId: user.laboratoryId },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

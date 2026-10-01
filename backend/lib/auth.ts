import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) throw new Error('JWT_SECRET env variable not set');

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'technician' | 'reviewer' | 'approver';
  laboratoryId?: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function extractToken(req: NextRequest): TokenPayload | null {
  try {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) return null;
    const token = auth.slice(7);
    return verifyToken(token);
  } catch {
    return null;
  }
}

export type Role = 'admin' | 'technician' | 'reviewer' | 'approver';

export function requireRoles(user: TokenPayload | null, roles: Role[]): void {
  if (!user) throw new AuthError(401, 'Unauthorized');
  if (!roles.includes(user.role)) throw new AuthError(403, 'Forbidden: insufficient role');
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function withAuth(handler: (req: NextRequest, user: TokenPayload) => Promise<Response>) {
  return async (req: NextRequest) => {
    const user = extractToken(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      return await handler(req, user);
    } catch (err) {
      if (err instanceof AuthError) {
        return Response.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  };
}

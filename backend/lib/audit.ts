import { connectDB } from './db';
import { AuditLog } from './models';
import { TokenPayload } from './auth';

export async function audit(
  user: TokenPayload | null,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {},
  ipAddress?: string
) {  
  try {
    await connectDB();
    await AuditLog.create({
      action,
      entityType,
      entityId,
      userId: user?.userId ?? 'system',
      userName: user?.name ?? 'system',
      userRole: user?.role ?? 'system',
      details,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

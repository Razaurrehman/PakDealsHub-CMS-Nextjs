import { prisma } from './prisma';

interface LogParams {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  siteId: string;
}

export async function logActivity(params: LogParams) {
  try {
    await prisma.activityLog.create({ data: { ...params, metadata: params.metadata as any } });
  } catch {
    // never block main flow due to logging failure
  }
}

export function getClientInfo(req: Request) {
  return {
    ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown',
    userAgent: req.headers.get('user-agent') ?? 'unknown',
  };
}

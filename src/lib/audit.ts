import { db } from '@/lib/db';

export async function logAction(
  actorId: string,
  action: string,
  targetEntity: string,
  targetId: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await db.auditLog.create({
      data: {
        actorId,
        action,
        targetEntity,
        targetId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

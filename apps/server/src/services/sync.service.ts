import { PrismaClient } from '@prisma/client';
import type { SyncBatchResult } from '@moviereview/shared';

const prisma = new PrismaClient();

export async function processSyncItem(
  userId: string,
  item: { clientEventId: string; entityType: string; payload: any }
): Promise<SyncBatchResult> {
  try {
    if (item.entityType === 'visit') {
      const existing = await prisma.visit.findUnique({
        where: { clientEventId: item.clientEventId },
      });

      if (existing) {
        return { clientEventId: item.clientEventId, status: 'duplicate', serverId: existing.id };
      }

      const visit = await prisma.visit.create({
        data: { ...item.payload, userId, clientEventId: item.clientEventId },
      });

      return { clientEventId: item.clientEventId, status: 'created', serverId: visit.id };
    }

    if (item.entityType === 'review') {
      const existing = await prisma.review.findUnique({
        where: { clientEventId: item.clientEventId },
      });

      if (existing) {
        return { clientEventId: item.clientEventId, status: 'duplicate', serverId: existing.id };
      }

      const review = await prisma.review.create({
        data: { ...item.payload, userId, clientEventId: item.clientEventId },
      });

      return { clientEventId: item.clientEventId, status: 'created', serverId: review.id };
    }

    return { clientEventId: item.clientEventId, status: 'error', error: 'Unknown entity type' };
  } catch (err: any) {
    return { clientEventId: item.clientEventId, status: 'error', error: err.message };
  }
}

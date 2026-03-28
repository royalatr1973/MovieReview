import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticateToken);

const syncBatchSchema = z.object({
  items: z.array(
    z.object({
      clientEventId: z.string(),
      entityType: z.enum(['visit', 'review']),
      payload: z.record(z.unknown()),
    })
  ).min(1).max(50),
});

router.post('/batch', validate(syncBatchSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { items } = req.body;
    const results: Array<{
      clientEventId: string;
      status: 'created' | 'duplicate' | 'error';
      serverId?: string;
      error?: string;
    }> = [];

    for (const item of items) {
      try {
        if (item.entityType === 'visit') {
          const existing = await prisma.visit.findUnique({
            where: { clientEventId: item.clientEventId },
          });

          if (existing) {
            results.push({
              clientEventId: item.clientEventId,
              status: 'duplicate',
              serverId: existing.id,
            });
            continue;
          }

          const visit = await prisma.visit.create({
            data: {
              ...item.payload as any,
              userId,
              clientEventId: item.clientEventId,
            },
          });

          results.push({
            clientEventId: item.clientEventId,
            status: 'created',
            serverId: visit.id,
          });
        } else if (item.entityType === 'review') {
          const existing = await prisma.review.findUnique({
            where: { clientEventId: item.clientEventId },
          });

          if (existing) {
            results.push({
              clientEventId: item.clientEventId,
              status: 'duplicate',
              serverId: existing.id,
            });
            continue;
          }

          const review = await prisma.review.create({
            data: {
              ...item.payload as any,
              userId,
              clientEventId: item.clientEventId,
            },
          });

          results.push({
            clientEventId: item.clientEventId,
            status: 'created',
            serverId: review.id,
          });
        }
      } catch (err: any) {
        results.push({
          clientEventId: item.clientEventId,
          status: 'error',
          error: err.message,
        });
      }
    }

    // Record sync events
    await prisma.syncEvent.createMany({
      data: results.map((r) => ({
        clientEventId: r.clientEventId,
        entityType: items.find((i) => i.clientEventId === r.clientEventId)!.entityType,
        syncStatus: r.status === 'error' ? 'failed' : 'synced',
        serverReceivedAt: new Date(),
        payload: items.find((i) => i.clientEventId === r.clientEventId)!.payload,
      })),
      skipDuplicates: true,
    });

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

export { router as syncRouter };

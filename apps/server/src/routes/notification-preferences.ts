import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const prisma = new PrismaClient();
const router = Router();

const patchSchema = z.object({
  reviewUpdateOptIn: z.boolean().optional(),
  digestMode: z.enum(['immediate', 'daily']).optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
});

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const pref = await prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    res.json(pref);
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/',
  authenticateToken,
  validate(patchSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.userId!;
      const data = req.body as z.infer<typeof patchSchema>;
      const pref = await prisma.notificationPreference.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });
      res.json(pref);
    } catch (err) {
      next(err);
    }
  }
);

export { router as notificationPreferencesRouter };

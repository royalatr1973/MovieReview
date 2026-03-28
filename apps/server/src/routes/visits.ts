import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticateToken);

const createVisitSchema = z.object({
  cinemaId: z.string(),
  entryTime: z.string().datetime(),
  exitTime: z.string().datetime().optional(),
  dwellMinutes: z.number().int().optional(),
  locationConfidence: z.number().min(0).max(1),
  qualificationState: z.string().default('pending'),
  promptState: z.string().default('pending'),
  clientEventId: z.string(),
});

const updateVisitSchema = z.object({
  exitTime: z.string().datetime().optional(),
  dwellMinutes: z.number().int().optional(),
  qualificationState: z.string().optional(),
  promptState: z.string().optional(),
});

router.post('/', validate(createVisitSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = req.body;
    const userId = req.userId!;

    const existing = await prisma.visit.findUnique({
      where: { clientEventId: data.clientEventId },
    });
    if (existing) {
      res.json(existing);
      return;
    }

    const visit = await prisma.visit.create({
      data: { ...data, userId },
    });
    res.status(201).json(visit);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where: { userId },
        include: { cinema: true, reviews: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.visit.count({ where: { userId } }),
    ]);

    res.json({
      data: visits,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const visit = await prisma.visit.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { cinema: true, reviews: { include: { movie: true } } },
    });

    if (!visit) {
      res.status(404).json({ message: 'Visit not found' });
      return;
    }

    res.json(visit);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(updateVisitSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const visit = await prisma.visit.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (!visit) {
      res.status(404).json({ message: 'Visit not found' });
      return;
    }

    const updated = await prisma.visit.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export { router as visitsRouter };

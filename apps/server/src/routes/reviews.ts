import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import prisma from '../lib/prisma';
const router = Router();

router.use(authenticateToken);

const createReviewSchema = z.object({
  visitId: z.string(),
  movieId: z.string().optional(),
  rawTitle: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().optional(),
  spoilerFlag: z.boolean().default(false),
  selectionSource: z.enum(['manual', 'autosuggest']),
  clientEventId: z.string(),
});

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  reviewText: z.string().optional(),
  spoilerFlag: z.boolean().optional(),
});

router.post('/', validate(createReviewSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = req.body;
    const userId: string = req.userId!;

    // Idempotency check
    const existing = await prisma.review.findUnique({
      where: { clientEventId: data.clientEventId },
    });
    if (existing) {
      res.json(existing);
      return;
    }

    // Verify visit belongs to user
    const visit = await prisma.visit.findFirst({
      where: { id: data.visitId, userId },
    });
    if (!visit) {
      res.status(404).json({ message: 'Visit not found' });
      return;
    }

    const review = await prisma.review.create({
      data: { ...data, userId },
    });
    res.status(201).json(review);
  } catch (err: any) {
    // Handle unique constraint violation (duplicate user+visit+movie)
    if (err.code === 'P2002') {
      res.status(409).json({ message: 'Review already exists for this visit and movie' });
      return;
    }
    next(err);
  }
});

router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId: string = req.userId!;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { userId },
        include: { movie: true, visit: { include: { cinema: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { userId } }),
    ]);

    res.json({
      data: reviews,
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
    const id = req.params.id as string;
    const userId: string = req.userId!;
    const review = await prisma.review.findFirst({
      where: { id, userId },
      include: { movie: true, visit: { include: { cinema: true } } },
    });

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    res.json(review);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(updateReviewSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const userId: string = req.userId!;
    const review = await prisma.review.findFirst({
      where: { id, userId },
    });

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    // Check edit window (24 hours)
    const hoursSinceCreation =
      (Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      res.status(403).json({ message: 'Edit window has expired (24 hours)' });
      return;
    }

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: { ...req.body, editedAt: new Date() },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const userId: string = req.userId!;
    const review = await prisma.review.findFirst({
      where: { id, userId },
    });

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    await prisma.review.delete({ where: { id: review.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as reviewsRouter };

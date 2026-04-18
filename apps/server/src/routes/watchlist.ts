import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const prisma = new PrismaClient();
const router = Router();

const addSchema = z.object({
  movieId: z.string().min(1),
});

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const items = await prisma.watchlist.findMany({
      where: { userId: req.userId! },
      include: { movie: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  authenticateToken,
  validate(addSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { movieId } = req.body as z.infer<typeof addSchema>;
      const movie = await prisma.movie.findUnique({ where: { id: movieId } });
      if (!movie) {
        res.status(404).json({ message: 'Movie not found' });
        return;
      }
      const item = await prisma.watchlist.upsert({
        where: { userId_movieId: { userId: req.userId!, movieId } },
        create: { userId: req.userId!, movieId },
        update: {},
      });
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/:movieId', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.watchlist.deleteMany({
      where: { userId: req.userId!, movieId: String(req.params.movieId) },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as watchlistRouter };

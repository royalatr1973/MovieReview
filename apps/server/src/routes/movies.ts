import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticateToken);

router.get('/search', async (req, res, next) => {
  try {
    const query = (req.query.q as string) || '';
    if (query.length < 2) {
      res.json({ data: [] });
      return;
    }

    const movies = await prisma.movie.findMany({
      where: {
        title: { contains: query, mode: 'insensitive' },
      },
      take: 10,
      orderBy: { title: 'asc' },
    });

    res.json({ data: movies });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const movie = await prisma.movie.findUnique({
      where: { id: req.params.id },
    });

    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    // Include aggregate rating
    const stats = await prisma.review.aggregate({
      where: { movieId: req.params.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    res.json({
      ...movie,
      averageRating: stats._avg.rating,
      reviewCount: stats._count.rating,
    });
  } catch (err) {
    next(err);
  }
});

export { router as moviesRouter };

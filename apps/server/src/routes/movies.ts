import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticateToken);

// List all movies with aggregate ratings
router.get('/', async (req, res, next) => {
  try {
    const movies = await prisma.movie.findMany({
      orderBy: { title: 'asc' },
      include: {
        _count: { select: { reviews: true } },
      },
    });

    // Get average ratings for all movies in one query
    const ratings = await prisma.review.groupBy({
      by: ['movieId'],
      _avg: { rating: true },
      _count: { rating: true },
    });

    const ratingsMap = new Map(
      ratings.map((r) => [r.movieId, { avg: r._avg.rating, count: r._count.rating }])
    );

    const data = movies.map((movie) => {
      const stats = ratingsMap.get(movie.id);
      return {
        ...movie,
        averageRating: stats?.avg ?? null,
        reviewCount: stats?.count ?? 0,
      };
    });

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

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

// Get reviews for a specific movie (all users)
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { movieId: req.params.id },
      include: {
        user: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: reviews });
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

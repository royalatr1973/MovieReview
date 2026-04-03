import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// All admin routes require auth (in production, add role-based check)
router.use(authenticateToken);

// ── Dashboard Stats ──────────────────────────────────────────────────────────
router.get('/stats', async (_req: AuthenticatedRequest, res, next) => {
  try {
    const [totalUsers, totalReviews, totalVisits, totalCinemas, totalMovies] =
      await Promise.all([
        prisma.user.count(),
        prisma.review.count(),
        prisma.visit.count(),
        prisma.cinema.count(),
        prisma.movie.count(),
      ]);

    // Reviews per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reviewsByDay = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
      FROM "Review"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date
    `;

    const reviewsPerDay = reviewsByDay.map((r) => ({
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: Number(r.count),
    }));

    // Top movies by review count
    const topMovies = await prisma.movie.findMany({
      select: {
        id: true,
        title: true,
        _count: { select: { reviews: true } },
      },
      orderBy: { reviews: { _count: 'desc' } },
      take: 10,
    });

    const topMoviesWithRating = await Promise.all(
      topMovies.map(async (m) => {
        const agg = await prisma.review.aggregate({
          where: { movieId: m.id },
          _avg: { rating: true },
        });
        return {
          id: m.id,
          title: m.title,
          reviewCount: m._count.reviews,
          avgRating: agg._avg.rating ?? 0,
        };
      }),
    );

    // Top cinemas by visit count
    const topCinemas = await prisma.cinema.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { visits: true } },
      },
      orderBy: { visits: { _count: 'desc' } },
      take: 10,
    });

    // Rating distribution
    const ratingDist = await prisma.$queryRaw<{ rating: number; count: bigint }[]>`
      SELECT rating, COUNT(*)::bigint as count
      FROM "Review"
      GROUP BY rating
      ORDER BY rating
    `;

    res.json({
      totalUsers,
      totalReviews,
      totalVisits,
      totalCinemas,
      totalMovies,
      reviewsPerDay,
      topMovies: topMoviesWithRating,
      topCinemas: topCinemas.map((c) => ({
        id: c.id,
        name: c.name,
        visitCount: c._count.visits,
      })),
      ratingDistribution: ratingDist.map((r) => ({
        rating: r.rating,
        count: Number(r.count),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── Reviews (admin view — all users) ─────────────────────────────────────────
router.get('/reviews', async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.review.findMany({
        include: {
          user: { select: { id: true, email: true, displayName: true } },
          movie: { select: { id: true, title: true } },
          visit: { include: { cinema: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count(),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/reviews/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = req.params.id as string;
    await prisma.review.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── Cinemas (admin CRUD) ─────────────────────────────────────────────────────
router.get('/cinemas', async (_req: AuthenticatedRequest, res, next) => {
  try {
    const cinemas = await prisma.cinema.findMany({
      include: { _count: { select: { visits: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(cinemas);
  } catch (err) {
    next(err);
  }
});

router.post('/cinemas', async (req: AuthenticatedRequest, res, next) => {
  try {
    const cinema = await prisma.cinema.create({ data: req.body });
    res.status(201).json(cinema);
  } catch (err) {
    next(err);
  }
});

router.patch('/cinemas/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const cinema = await prisma.cinema.update({
      where: { id },
      data: req.body,
    });
    res.json(cinema);
  } catch (err) {
    next(err);
  }
});

// ── Movies (admin view + merge + TMDB link) ──────────────────────────────────
router.get('/movies', async (_req: AuthenticatedRequest, res, next) => {
  try {
    const movies = await prisma.movie.findMany({
      include: { _count: { select: { reviews: true } } },
      orderBy: { title: 'asc' },
    });

    // Add avgRating
    const withRating = await Promise.all(
      movies.map(async (m) => {
        const agg = await prisma.review.aggregate({
          where: { movieId: m.id },
          _avg: { rating: true },
        });
        return { ...m, avgRating: agg._avg.rating };
      }),
    );

    res.json(withRating);
  } catch (err) {
    next(err);
  }
});

router.post('/movies/merge', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { sourceId, targetId } = req.body;
    if (!sourceId || !targetId || sourceId === targetId) {
      res.status(400).json({ message: 'Invalid source/target' });
      return;
    }

    // Move all reviews from source to target
    await prisma.review.updateMany({
      where: { movieId: sourceId },
      data: { movieId: targetId },
    });

    // Delete source movie
    await prisma.movie.delete({ where: { id: sourceId } });

    res.json({ message: 'Movies merged successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/movies/:id/link-tmdb', async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const { tmdbId } = req.body;

    const movie = await prisma.movie.update({
      where: { id },
      data: { tmdbId: parseInt(tmdbId) },
    });

    res.json(movie);
  } catch (err) {
    next(err);
  }
});

export { router as adminRouter };

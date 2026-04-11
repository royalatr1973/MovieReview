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

// ── Review Search (must be before /reviews to avoid route conflict) ──────────
router.get('/reviews/search', async (req: AuthenticatedRequest, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where = q.length >= 2 ? {
      OR: [
        { rawTitle: { contains: q, mode: 'insensitive' as const } },
        { reviewText: { contains: q, mode: 'insensitive' as const } },
        { movie: { title: { contains: q, mode: 'insensitive' as const } } },
        { user: { displayName: { contains: q, mode: 'insensitive' as const } } },
        { user: { email: { contains: q, mode: 'insensitive' as const } } },
      ],
    } : {};

    const [data, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, displayName: true } },
          movie: { select: { id: true, title: true } },
          visit: { include: { cinema: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.review.count({ where }),
    ]);
    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
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
    const allowedFields = ['name', 'latitude', 'longitude', 'radius', 'address', 'chain', 'city', 'active'] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in req.body) {
        data[key] = req.body[key];
      }
    }
    const cinema = await prisma.cinema.update({
      where: { id },
      data,
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

    // Verify both movies exist
    const [source, target] = await Promise.all([
      prisma.movie.findUnique({ where: { id: sourceId } }),
      prisma.movie.findUnique({ where: { id: targetId } }),
    ]);
    if (!source) {
      res.status(404).json({ message: `Source movie ${sourceId} not found` });
      return;
    }
    if (!target) {
      res.status(404).json({ message: `Target movie ${targetId} not found` });
      return;
    }

    // Move all reviews from source to target, then delete source
    await prisma.$transaction([
      prisma.review.updateMany({
        where: { movieId: sourceId },
        data: { movieId: targetId },
      }),
      prisma.movie.delete({ where: { id: sourceId } }),
    ]);

    res.json({ message: 'Movies merged successfully' });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({
        message: 'Merge failed due to a unique constraint violation — a review may already exist for the target movie with the same unique key',
      });
      return;
    }
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

// ── Review Editing ──────────────────────────────────────────────────────────
router.patch('/reviews/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const allowedFields = ['rating', 'reviewText', 'spoilerFlag'] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in req.body) data[key] = req.body[key];
    }
    data.editedAt = new Date();
    const review = await prisma.review.update({ where: { id }, data });
    res.json(review);
  } catch (err) {
    next(err);
  }
});

// ── Bulk Movie Upload ───────────────────────────────────────────────────────
router.post('/movies/bulk', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { movies } = req.body; // [{title, year?, language?}]
    let created = 0, skipped = 0;
    for (const m of movies) {
      const existing = await prisma.movie.findFirst({
        where: { title: { equals: m.title, mode: 'insensitive' } },
      });
      if (existing) { skipped++; continue; }
      const id = `bulk-${m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      await prisma.movie.create({
        data: { id, title: m.title, year: m.year || null, language: m.language || null, userSubmitted: false },
      });
      created++;
    }
    res.json({ created, skipped, total: await prisma.movie.count() });
  } catch (err) {
    next(err);
  }
});

// ── User Management ─────────────────────────────────────────────────────────
router.get('/users', async (_req: AuthenticatedRequest, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, displayName: true, passwordHash: true, passwordPlain: true, createdAt: true,
        _count: { select: { reviews: true, visits: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// ── Edit User (admin) ───────────────────────────────────────────────────────
router.patch('/users/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { email, displayName, newPassword } = req.body;

    const updateData: Record<string, unknown> = {};
    if (email !== undefined) updateData.email = email;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (newPassword) {
      const bcrypt = await import('bcryptjs');
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
      updateData.passwordPlain = newPassword;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, email: true, displayName: true, passwordHash: true, passwordPlain: true, createdAt: true,
        _count: { select: { reviews: true, visits: true } },
      },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ── Export Reviews CSV ──────────────────────────────────────────────────────
router.get('/export/reviews', async (_req: AuthenticatedRequest, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        user: { select: { email: true, displayName: true } },
        movie: { select: { title: true } },
        visit: { include: { cinema: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const header = 'User,Email,Movie,Cinema,Rating,Review,Spoiler,Date\n';
    const rows = reviews.map(r => {
      const user = r.user.displayName || r.user.email;
      const movie = r.movie?.title || r.rawTitle || '';
      const cinema = r.visit.cinema.name;
      const text = (r.reviewText || '').replace(/"/g, '""');
      const date = new Date(r.createdAt).toISOString();
      return `"${user}","${r.user.email}","${movie}","${cinema}",${r.rating},"${text}",${r.spoilerFlag},${date}`;
    }).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=reviews.csv');
    res.send(header + rows);
  } catch (err) {
    next(err);
  }
});

// ── Export Visits CSV ───────────────────────────────────────────────────────
router.get('/export/visits', async (_req: AuthenticatedRequest, res, next) => {
  try {
    const visits = await prisma.visit.findMany({
      include: {
        user: { select: { email: true, displayName: true } },
        cinema: { select: { name: true } },
      },
      orderBy: { entryTime: 'desc' },
    });
    const header = 'User,Email,Cinema,EntryTime,ExitTime,DwellMinutes,Confidence,Status\n';
    const rows = visits.map(v => {
      const user = v.user.displayName || v.user.email;
      return `"${user}","${v.user.email}","${v.cinema.name}",${v.entryTime.toISOString()},${v.exitTime?.toISOString() || ''},${v.dwellMinutes || ''},${v.locationConfidence},${v.qualificationState}`;
    }).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=visits.csv');
    res.send(header + rows);
  } catch (err) {
    next(err);
  }
});

// ── Movie Detail with All Reviews ───────────────────────────────────────────
router.get('/movies/:id/reviews', async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) { res.status(404).json({ message: 'Movie not found' }); return; }
    const reviews = await prisma.review.findMany({
      where: { movieId: id },
      include: {
        user: { select: { displayName: true, email: true } },
        visit: { include: { cinema: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const agg = await prisma.review.aggregate({
      where: { movieId: id },
      _avg: { rating: true },
      _count: { rating: true },
    });
    res.json({
      movie,
      reviews,
      avgRating: agg._avg.rating,
      reviewCount: agg._count.rating,
    });
  } catch (err) {
    next(err);
  }
});

export { router as adminRouter };

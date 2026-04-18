import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';
const router = Router();

router.use(authenticateToken);

router.get('/', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 50000; // default 50km

    if (isNaN(lat) || isNaN(lng)) {
      // Return all cinemas if no location provided
      const cinemas = await prisma.cinema.findMany({ orderBy: { name: 'asc' } });
      res.json({ data: cinemas });
      return;
    }

    // Simple bounding box filter (approximate, sufficient for MVP)
    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos(lat * (Math.PI / 180)));

    const cinemas = await prisma.cinema.findMany({
      where: {
        latitude: { gte: lat - latDelta, lte: lat + latDelta },
        longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ data: cinemas });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const cinema = await prisma.cinema.findUnique({
      where: { id: req.params.id },
    });

    if (!cinema) {
      res.status(404).json({ message: 'Cinema not found' });
      return;
    }

    // Include aggregate stats
    const stats = await prisma.review.aggregate({
      where: { visit: { cinemaId: req.params.id } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    res.json({
      ...cinema,
      averageRating: stats._avg.rating,
      reviewCount: stats._count.rating,
    });
  } catch (err) {
    next(err);
  }
});

/** Reviews left at this cinema, with movie metadata and reviewer display name. */
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const reviews = await prisma.review.findMany({
      where: { visit: { cinemaId: req.params.id } },
      include: {
        movie: true,
        user: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});

/** Changes since a given timestamp, for clients to refresh local cinema cache. */
router.get('/updates/since', async (req, res, next) => {
  try {
    const sinceStr = req.query.since as string | undefined;
    const since = sinceStr ? new Date(sinceStr) : new Date(0);
    // Cinema model lacks an updatedAt; use an all-cinemas return scoped by active.
    const cinemas = await prisma.cinema.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    res.json({ cinemas, fetchedAt: new Date().toISOString(), since: since.toISOString() });
  } catch (err) {
    next(err);
  }
});

export { router as cinemasRouter };

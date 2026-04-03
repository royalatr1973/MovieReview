import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import prisma from '../lib/prisma';
const router = Router();

router.use(authenticateToken);

const syncBatchSchema = z.object({
  items: z
    .array(
      z.object({
        clientEventId: z.string(),
        entityType: z.enum(['visit', 'review']),
        payload: z.record(z.unknown()),
      })
    )
    .min(1)
    .max(50),
});

/**
 * Resolve a mobile movie ID (e.g. "tmdb-12345" or "user-{uuid}") to a
 * server-side Movie record, creating it if needed.
 */
async function resolveMovie(
  movieId: string | null | undefined,
  rawTitle: string | null | undefined,
  payload: Record<string, unknown>
): Promise<string | null> {
  if (!movieId && !rawTitle) return null;

  // TMDB-sourced movie: id = "tmdb-{tmdbId}"
  // Uses upsert to avoid race conditions with concurrent sync requests
  if (movieId?.startsWith('tmdb-')) {
    const tmdbId = parseInt(movieId.replace('tmdb-', ''), 10);
    const movie = await prisma.movie.upsert({
      where: { id: movieId },
      update: {},  // Don't overwrite existing data
      create: {
        id: movieId,
        title: String(payload.title ?? rawTitle ?? movieId),
        year: payload.year ? Number(payload.year) : null,
        language: payload.language ? String(payload.language) : null,
        posterUrl: payload.posterUrl ? String(payload.posterUrl) : null,
        tmdbId,
        userSubmitted: false,
      },
    });
    return movie.id;
  }

  // User-submitted movie: id = "user-{uuid}"
  // Try title match first, then upsert by mobile ID to avoid duplicates
  if (movieId?.startsWith('user-') || rawTitle) {
    const title = String(rawTitle ?? payload.title ?? movieId);

    // Check for case-insensitive title match first
    const existing = await prisma.movie.findFirst({
      where: { title: { equals: title, mode: 'insensitive' } },
    });
    if (existing) return existing.id;

    const id = movieId ?? `user-${Date.now()}`;
    try {
      const movie = await prisma.movie.upsert({
        where: { id },
        update: {},
        create: {
          id,
          title,
          year: payload.year ? Number(payload.year) : null,
          language: payload.language ? String(payload.language) : null,
          userSubmitted: true,
        },
      });
      return movie.id;
    } catch {
      // Race: another request created a movie with same title between findFirst and upsert
      const retry = await prisma.movie.findFirst({
        where: { title: { equals: title, mode: 'insensitive' } },
      });
      return retry?.id ?? null;
    }
  }

  // Fallback: try to use movieId as-is (maybe it's already a server ID)
  if (movieId) {
    const existing = await prisma.movie.findUnique({ where: { id: movieId } });
    if (existing) return existing.id;
  }

  return null;
}

/**
 * Resolve a mobile visit ID to its server-side Visit ID.
 * The mobile stores visitId == clientEventId, so we look up by clientEventId.
 */
async function resolveVisitId(localVisitId: string | undefined): Promise<string | null> {
  if (!localVisitId) return null;
  const visit = await prisma.visit.findFirst({
    where: {
      OR: [
        { id: localVisitId },
        { clientEventId: localVisitId },
      ],
    },
  });
  return visit?.id ?? null;
}

router.post(
  '/batch',
  validate(syncBatchSchema),
  async (req: AuthenticatedRequest, res, next) => {
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
              results.push({ clientEventId: item.clientEventId, status: 'duplicate', serverId: existing.id });
              continue;
            }

            const p = item.payload as Record<string, unknown>;
            const visit = await prisma.visit.create({
              data: {
                userId,
                cinemaId: String(p.cinemaId ?? 'unknown'),
                entryTime: new Date(String(p.entryTime)),
                exitTime: p.exitTime ? new Date(String(p.exitTime)) : null,
                dwellMinutes: p.dwellMinutes ? Number(p.dwellMinutes) : null,
                locationConfidence: Number(p.locationConfidence ?? 0.9),
                qualificationState: String(p.qualificationState ?? 'soft_confirm'),
                promptState: String(p.promptState ?? 'pending'),
                clientEventId: item.clientEventId,
              },
            });
            results.push({ clientEventId: item.clientEventId, status: 'created', serverId: visit.id });
          } else if (item.entityType === 'review') {
            const existing = await prisma.review.findUnique({
              where: { clientEventId: item.clientEventId },
            });
            if (existing) {
              results.push({ clientEventId: item.clientEventId, status: 'duplicate', serverId: existing.id });
              continue;
            }

            const p = item.payload as Record<string, unknown>;

            // Resolve IDs that may differ between mobile and server
            const serverVisitId = await resolveVisitId(String(p.visitId ?? ''));
            const serverMovieId = await resolveMovie(
              p.movieId as string | null,
              p.rawTitle as string | null,
              p
            );

            if (!serverVisitId) {
              results.push({
                clientEventId: item.clientEventId,
                status: 'error',
                error: `Visit ${p.visitId} not found on server — sync the visit first`,
              });
              continue;
            }

            const review = await prisma.review.create({
              data: {
                userId,
                visitId: serverVisitId,
                movieId: serverMovieId,
                rawTitle: p.rawTitle ? String(p.rawTitle) : null,
                rating: Number(p.rating),
                reviewText: p.reviewText ? String(p.reviewText) : null,
                spoilerFlag: Boolean(p.spoilerFlag ?? false),
                selectionSource: String(p.selectionSource ?? 'manual'),
                matchConfidence: p.matchConfidence ? Number(p.matchConfidence) : null,
                clientEventId: item.clientEventId,
              },
            });
            results.push({ clientEventId: item.clientEventId, status: 'created', serverId: review.id });
          }
        } catch (err: any) {
          results.push({
            clientEventId: item.clientEventId,
            status: 'error',
            error: 'Failed to process item',
          });
        }
      }

      // Record sync events (skip duplicates in case of retries)
      await prisma.syncEvent.createMany({
        data: results.map((r) => ({
          clientEventId: r.clientEventId,
          entityType: items.find((i: any) => i.clientEventId === r.clientEventId)!.entityType,
          syncStatus: r.status === 'error' ? 'failed' : 'synced',
          serverReceivedAt: new Date(),
          payload: items.find((i: any) => i.clientEventId === r.clientEventId)!.payload,
        })),
        skipDuplicates: true,
      });

      res.json({ results });
    } catch (err) {
      next(err);
    }
  }
);

export { router as syncRouter };

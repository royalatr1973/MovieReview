import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getMovieAggregateRating(movieId: string) {
  const stats = await prisma.review.aggregate({
    where: { movieId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    averageRating: stats._avg.rating,
    reviewCount: stats._count.rating,
  };
}

export async function getCinemaAggregateRating(cinemaId: string) {
  const stats = await prisma.review.aggregate({
    where: { visit: { cinemaId } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    averageRating: stats._avg.rating,
    reviewCount: stats._count.rating,
  };
}

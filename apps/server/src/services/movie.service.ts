import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function searchMovies(query: string, limit = 10) {
  return prisma.movie.findMany({
    where: {
      title: { contains: query, mode: 'insensitive' },
    },
    take: limit,
    orderBy: { title: 'asc' },
  });
}

export async function getMovieWithRatings(movieId: string) {
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) return null;

  const stats = await prisma.review.aggregate({
    where: { movieId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    ...movie,
    averageRating: stats._avg.rating,
    reviewCount: stats._count.rating,
  };
}

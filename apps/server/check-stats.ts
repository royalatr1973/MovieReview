import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check rating distribution
  const ratingDist = await prisma.$queryRaw<{ rating: number; count: bigint }[]>`
    SELECT rating, COUNT(*)::bigint as count
    FROM "Review"
    GROUP BY rating
    ORDER BY rating
  `;
  console.log('Rating distribution:', ratingDist.map(r => ({ rating: r.rating, count: Number(r.count) })));

  // Check top movies
  const topMovies = await prisma.movie.findMany({
    select: {
      id: true,
      title: true,
      _count: { select: { reviews: true } },
    },
    orderBy: { reviews: { _count: 'desc' } },
    take: 10,
  });

  for (const m of topMovies) {
    const agg = await prisma.review.aggregate({
      where: { movieId: m.id },
      _avg: { rating: true },
    });
    console.log(`  ${m.title}: ${m._count.reviews} reviews, avg: ${agg._avg.rating}`);
  }

  // Check reviews tab data
  const reviews = await prisma.review.findMany({
    include: {
      user: { select: { id: true, email: true, displayName: true } },
      movie: { select: { id: true, title: true } },
      visit: { include: { cinema: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log('\nReviews tab data:');
  for (const r of reviews) {
    console.log(`  User: "${r.user.displayName}" | Movie: "${r.movie?.title}" | Rating: ${r.rating} | Cinema: "${r.visit.cinema.name}"`);
  }

  await prisma.$disconnect();
}
main();

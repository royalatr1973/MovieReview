import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const [totalReviews, totalMovies, totalVisits] = await Promise.all([
    prisma.review.count(),
    prisma.movie.count(),
    prisma.visit.count(),
  ]);
  console.log('Stats:', { totalReviews, totalMovies, totalVisits });

  const reviews = await prisma.review.findMany({
    include: {
      user: { select: { email: true, displayName: true } },
      movie: { select: { title: true } },
      visit: { include: { cinema: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log('\nReviews for dashboard:');
  for (const r of reviews) {
    console.log(`  ${r.user.displayName || r.user.email} | ${r.movie?.title || r.rawTitle} | ${r.rating} stars | ${r.visit.cinema.name}`);
  }

  await prisma.$disconnect();
}
main();

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const reviews = await prisma.review.findMany({
    include: { user: true, movie: true },
  });

  console.log('=== REVIEWS ===');
  for (const r of reviews) {
    console.log(`  User: ${r.user?.email} (${r.user?.displayName || 'no name'})`);
    console.log(`  Movie: ${r.movie?.title || r.rawTitle || 'NONE'}`);
    console.log(`  Rating: ${r.rating}`);
    console.log(`  movieId: ${r.movieId}`);
    console.log('---');
  }

  const movies = await prisma.movie.findMany();
  console.log('\n=== MOVIES ===');
  for (const m of movies) {
    console.log(`  ${m.id} | ${m.title} | userSubmitted: ${m.userSubmitted}`);
  }

  const users = await prisma.user.findMany();
  console.log('\n=== USERS ===');
  for (const u of users) {
    console.log(`  ${u.id.slice(0,8)} | ${u.email} | ${u.displayName || 'no name'}`);
  }

  await prisma.$disconnect();
}

main();

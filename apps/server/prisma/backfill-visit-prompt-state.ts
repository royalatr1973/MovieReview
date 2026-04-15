/**
 * Backfill Visit.promptState = 'reviewed' for every visit that already
 * has at least one Review row in the database.
 *
 * Historical data is inconsistent because earlier versions of the
 * review-create endpoint did not update the linked visit. Running this
 * script once fixes the admin dashboard counts and the mobile app's
 * "Tap to review" state for already-reviewed visits.
 *
 * Usage:
 *   cd apps/server
 *   npm run db:backfill-visits
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Backfilling Visit.promptState from Review table...');

  // Distinct visitIds that have at least one review.
  const reviewed = await prisma.review.findMany({
    select: { visitId: true },
    distinct: ['visitId'],
  });

  const visitIds = reviewed.map((r) => r.visitId);
  console.log(`Found ${visitIds.length} visits with at least one review.`);

  if (visitIds.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  // Only update visits that are not already marked 'reviewed' so the
  // script is idempotent and cheap to re-run.
  const result = await prisma.visit.updateMany({
    where: {
      id: { in: visitIds },
      promptState: { not: 'reviewed' },
    },
    data: { promptState: 'reviewed' },
  });

  console.log(`Updated ${result.count} visits to promptState='reviewed'.`);

  // Quick sanity summary by promptState.
  const summary = await prisma.visit.groupBy({
    by: ['promptState'],
    _count: { _all: true },
  });

  console.log('\nVisit promptState distribution after backfill:');
  for (const row of summary) {
    console.log(`  ${row.promptState.padEnd(12)} ${row._count._all}`);
  }
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

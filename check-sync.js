const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const events = await p.syncEvent.findMany({ orderBy: { serverReceivedAt: 'desc' }, take: 15 });
  console.log('=== Recent Sync Events ===');
  events.forEach(e => console.log(
    e.clientEventId.slice(0,8) + '...',
    e.entityType.padEnd(8),
    e.syncStatus.padEnd(8),
    e.serverReceivedAt.toISOString().slice(0,19)
  ));

  const failed = events.filter(e => e.syncStatus === 'failed');
  if (failed.length > 0) {
    console.log('\n=== Failed Payloads ===');
    failed.forEach(e => {
      console.log(e.clientEventId.slice(0,8), JSON.stringify(e.payload).slice(0,200));
    });
  }

  await p.$disconnect();
})();

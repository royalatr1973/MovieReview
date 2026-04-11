const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const events = await p.syncEvent.findMany({
    where: { entityType: 'review' },
    orderBy: { serverReceivedAt: 'desc' },
    take: 15
  });
  console.log('=== Review Sync Events ===');
  if (events.length === 0) {
    console.log('No review sync events found');
  }
  events.forEach(e => {
    console.log(e.clientEventId.slice(0,12), e.syncStatus, JSON.stringify(e.payload).slice(0,300));
  });

  const failedEvents = await p.syncEvent.findMany({
    where: { syncStatus: 'failed' },
    orderBy: { serverReceivedAt: 'desc' },
    take: 10
  });
  console.log('\n=== All Failed Events ===');
  if (failedEvents.length === 0) {
    console.log('No failed events');
  }
  failedEvents.forEach(e => {
    console.log(e.clientEventId.slice(0,12), e.entityType, JSON.stringify(e.payload).slice(0,300));
  });

  await p.$disconnect();
})();

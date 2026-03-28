import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getRecentVisitCount(
  userId: string,
  cinemaId: string,
  dayWindow: number
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - dayWindow);

  return prisma.visit.count({
    where: {
      userId,
      cinemaId,
      createdAt: { gte: cutoff },
    },
  });
}

export async function getVisitWithDetails(visitId: string, userId: string) {
  return prisma.visit.findFirst({
    where: { id: visitId, userId },
    include: {
      cinema: true,
      reviews: { include: { movie: true } },
    },
  });
}

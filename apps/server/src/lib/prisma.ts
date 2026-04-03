import { PrismaClient } from '@prisma/client';

/**
 * Singleton PrismaClient — avoids creating multiple connection pools
 * across route files.
 */
const prisma = new PrismaClient();

export default prisma;

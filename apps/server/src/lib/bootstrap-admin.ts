import prisma from './prisma';

/**
 * Promotes the user whose email matches ADMIN_EMAIL to isAdmin=true on boot.
 * No-op if the env var is unset or the user doesn't exist yet. Safe to call
 * on every startup.
 */
export async function bootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isAdmin: true },
    });
    if (!user) {
      console.log(`[bootstrap-admin] No user found for ADMIN_EMAIL=${email}; skipping.`);
      return;
    }
    if (user.isAdmin) {
      return;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true },
    });
    console.log(`[bootstrap-admin] Promoted ${email} to admin.`);
  } catch (err) {
    console.error('[bootstrap-admin] Failed to promote admin user:', err);
  }
}

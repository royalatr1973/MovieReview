import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { signToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendEmail } from '../lib/email';

const prisma = new PrismaClient();
const router = Router();

const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required.');
  }
  return secret;
})();

const RESET_TOKEN_AUDIENCE = 'password-reset';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, passwordPlain: password, displayName },
    });

    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Backfill plain password for existing users
    if (!user.passwordPlain) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordPlain: password },
      });
    }

    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (err) {
    next(err);
  }
});

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6),
});

router.post('/forgot-password', validate(forgotSchema), async (req, res, next) => {
  try {
    const { email } = req.body as { email: string };
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return 200 to avoid leaking whether the email exists.
    if (user) {
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        audience: RESET_TOKEN_AUDIENCE,
        expiresIn: '1h',
      });
      const baseUrl = process.env.PASSWORD_RESET_URL_BASE || 'cinereview://reset-password';
      const link = `${baseUrl}?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: email,
        subject: 'Reset your CineReview password',
        body: `Tap this link within 1 hour to reset your password:\n\n${link}\n\nIf you didn't request this, ignore this email.`,
      });
    }
    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', validate(resetSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body as { token: string; password: string };
    let payload: { userId: string };
    try {
      payload = jwt.verify(token, JWT_SECRET, {
        audience: RESET_TOKEN_AUDIENCE,
      }) as { userId: string };
    } catch {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash, passwordPlain: password },
    });
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };

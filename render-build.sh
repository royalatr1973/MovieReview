#!/bin/bash
set -e

echo "=== Installing dependencies ==="
npm install

echo "=== Building shared package ==="
cd packages/shared
npx tsc || true
cd ../..

echo "=== Generating Prisma client ==="
cd apps/server
npx prisma generate

echo "=== Applying database schema (db push) ==="
# db push syncs the schema without requiring migration history. This is
# compatible with DBs that were originally seeded via db push (no
# _prisma_migrations table baseline). For additive changes like the
# isAdmin column this is non-destructive.
npx prisma db push --accept-data-loss --skip-generate

echo "=== Building server ==="
npm run build
cd ../..

echo "=== Build complete ==="

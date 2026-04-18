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

echo "=== Applying database migrations ==="
npx prisma migrate deploy

echo "=== Building server ==="
npm run build
cd ../..

echo "=== Build complete ==="

# CineReview Database Setup Script
# =================================
# Run this from the apps/server directory:
#   powershell -ExecutionPolicy Bypass -File setup-db.ps1
#
# Prerequisites: PostgreSQL 16 running on localhost:5432

$ErrorActionPreference = "Stop"

# Prompt for PostgreSQL password
$pgPassword = Read-Host "Enter your PostgreSQL 'postgres' user password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$env:PGPASSWORD = $plainPassword
$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"  # PG18 client connects to PG16 server

Write-Host "`n=== Step 1: Creating 'cinereview' database ===" -ForegroundColor Cyan
& $psqlPath -U postgres -h 127.0.0.1 -p 5432 -c "CREATE DATABASE cinereview;" 2>$null
Write-Host "Database ready."

# Update the .env file with the correct password
$envPath = Join-Path $PSScriptRoot ".env"
$envContent = @"
# PostgreSQL connection
DATABASE_URL="postgresql://postgres:${plainPassword}@localhost:5432/cinereview"

# JWT signing secret
JWT_SECRET="cinereview-dev-jwt-secret-change-in-prod"

# Server port
PORT=3000
"@
Set-Content $envPath $envContent
Write-Host "Updated .env with your credentials."

Write-Host "`n=== Step 2: Running Prisma migrations ===" -ForegroundColor Cyan
npx prisma db push --accept-data-loss
Write-Host "Schema pushed."

Write-Host "`n=== Step 3: Generating Prisma client ===" -ForegroundColor Cyan
npx prisma generate
Write-Host "Client generated."

Write-Host "`n=== Step 4: Seeding database ===" -ForegroundColor Cyan
npx tsx prisma/seed.ts
Write-Host "Seed complete."

Write-Host "`n=== All done! ===" -ForegroundColor Green
Write-Host "Start the server with: npm run dev"
Write-Host "Health check:          curl http://localhost:3000/api/health"

# Clean up
$env:PGPASSWORD = ""
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

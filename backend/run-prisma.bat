@echo off
cd /d "%~dp0"
npx prisma migrate deploy
npx prisma generate

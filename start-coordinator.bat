@echo off
cd /d "C:\Users\UncleD\OneDrive\Área de Trabalho\ViralFactoryNew"
call npm run build
set NODE_ENV=production
set PORT=4000
node dist\server.cjs

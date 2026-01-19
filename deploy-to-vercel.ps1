# Vercel Deployment Script
# This script will help you link and deploy to your existing Vercel project

Write-Host "=== Vercel Deployment Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to Vercel (requires browser interaction)
Write-Host "Step 1: Logging in to Vercel..." -ForegroundColor Yellow
Write-Host "This will open a browser window for authentication." -ForegroundColor Gray
npx vercel login

# Step 2: Link to existing project
Write-Host ""
Write-Host "Step 2: Linking to existing Vercel project..." -ForegroundColor Yellow
Write-Host "You will be prompted to select your existing project." -ForegroundColor Gray
npx vercel link

# Step 3: Deploy to production
Write-Host ""
Write-Host "Step 3: Deploying to Vercel..." -ForegroundColor Yellow
npx vercel --prod

Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green

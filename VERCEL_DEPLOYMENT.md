# Vercel Deployment Guide

## Required Environment Variables

You **must** add these environment variables in your Vercel project settings:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Your Supabase anonymous/public key

3. **OPENAI_API_KEY**
   - Your OpenAI API key for the AI assistant feature

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Your Supabase URL
   - **Environment**: Production, Preview, Development (select all)
4. Repeat for the other two variables
5. **Redeploy** your project after adding the variables

## Supabase OAuth Redirect URLs

After deployment, make sure to add your Vercel URL to Supabase:

1. Go to your Supabase Dashboard → Authentication → URL Configuration
2. Add your production URL: `https://your-vercel-app.vercel.app/auth/callback`
3. Also add your preview URLs if needed: `https://your-vercel-app-*.vercel.app/auth/callback`

## Troubleshooting 404 Errors

If you're getting a 404 error:

1. **Check Build Logs**: Go to Vercel Dashboard → Deployments → Click on the latest deployment → View Build Logs
2. **Verify Environment Variables**: Make sure all required variables are set
3. **Check Runtime Logs**: View the function logs to see if there are runtime errors
4. **Verify Build Success**: Ensure the build completed successfully

## Common Issues

- **404 Error**: Usually means missing environment variables or build failure
- **Authentication Errors**: Check Supabase redirect URLs are configured correctly
- **API Errors**: Verify `OPENAI_API_KEY` is set correctly

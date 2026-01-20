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

**CRITICAL: This is the most common cause of localhost redirect issues!**

After deployment, you **must** configure Supabase with your Vercel URL:

### Step 1: Update Site URL (IMPORTANT!)
1. Go to your Supabase Dashboard → **Authentication** → **URL Configuration**
2. Find the **"Site URL"** field (this is the default redirect URL)
3. **Change it from `http://localhost:3000` to your production URL**: `https://your-vercel-app.vercel.app`
4. **This is critical** - Supabase uses the Site URL as the default redirect, which overrides the `redirectTo` parameter if not properly configured

### Step 2: Add Redirect URLs
1. In the same **URL Configuration** section, find **"Redirect URLs"**
2. Add your production callback URL: `https://your-vercel-app.vercel.app/auth/callback`
3. Also add your preview URLs if needed: `https://your-vercel-app-*.vercel.app/auth/callback`
4. Keep `http://localhost:3000/auth/callback` for local development

**Note:** The Site URL must match your production domain. If it's set to localhost, all OAuth redirects will go to localhost even in production!

## Troubleshooting 404 Errors

If you're getting a 404 error:

1. **Check Build Logs**: Go to Vercel Dashboard → Deployments → Click on the latest deployment → View Build Logs
2. **Verify Environment Variables**: Make sure all required variables are set
3. **Check Runtime Logs**: View the function logs to see if there are runtime errors
4. **Verify Build Success**: Ensure the build completed successfully

## Common Issues

- **Redirecting to localhost after login**: 
  - **Most common cause**: Site URL in Supabase is set to `http://localhost:3000`
  - **Fix**: Go to Supabase Dashboard → Authentication → URL Configuration → Change Site URL to your Vercel URL
  - Also verify redirect URLs include your production callback URL
- **404 Error**: Usually means missing environment variables or build failure
- **Authentication Errors**: Check Supabase redirect URLs are configured correctly
- **API Errors**: Verify `OPENAI_API_KEY` is set correctly

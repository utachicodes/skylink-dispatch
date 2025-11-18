# Railway Deployment Guide

This guide will help you deploy the SkyLink backend to Railway and configure the frontend to use it.

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account
1. Go to [railway.app](https:/A/railway.app)
2. Sign up with GitHub (recommended) or email
3. Verify your email if needed

### 1.2 Create New Project
1. Click **"New Project"** in Railway dashboard
2. Select **"Deploy from GitHub repo"**
3. Choose your `skylink-dispatch` repository
4. Railway will detect it's a Node.js project

### 1.3 Configure Service
1. Railway will create a service automatically
2. Click on the service to configure it
3. Go to **Settings** → **Root Directory**
4. Set root directory to: `server`
5. Railway will automatically detect:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

### 1.4 Set Environment Variables
In Railway service settings → **Variables**, add:

```
PORT=4000
NODE_ENV=production
```

**Note**: Railway automatically provides `PORT`, but you can set a default. Railway will override it with their assigned port.

### 1.5 Deploy
1. Railway will automatically deploy when you push to your main branch
2. Or click **"Deploy"** to trigger manually
3. Wait for build to complete (usually 2-3 minutes)

### 1.6 Get Your Railway URL
1. Once deployed, go to **Settings** → **Networking**
2. Click **"Generate Domain"** to get a public URL
3. Your URL will look like: `https://skylink-production.up.railway.app`
4. **Copy this URL** - you'll need it for the frontend

## Step 2: Configure Frontend

### 2.1 Update Vercel Environment Variables
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add or update:
   - **Name**: `VITE_CORE_API_URL`
   - **Value**: Your Railway URL (e.g., `https://skylink-production.up.railway.app`)
   - **Environments**: Select all (Production, Preview, Development)
4. Click **Save**

### 2.2 Redeploy Frontend
1. Go to **Deployments** in Vercel
2. Click **"..."** on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

## Step 3: Verify Deployment

### 3.1 Test Backend
Open these URLs in your browser:

- `https://your-railway-url.up.railway.app/` - Should return service info
- `https://your-railway-url.up.railway.app/health` - Should return `{"status":"ok",...}`
- `https://your-railway-url.up.railway.app/api/missions` - Should return `[]`

### 3.2 Test Frontend
1. Open your Vercel frontend URL
2. Open browser DevTools → Console
3. You should see: `[SkyLink] Using Core API: https://your-railway-url...`
4. Navigate to `/operator` or `/admin` - should not show 404 errors

## Step 4: Custom Domain (Optional)

### 4.1 Add Custom Domain in Railway
1. Go to Railway service → **Settings** → **Networking**
2. Click **"Custom Domain"**
3. Enter your domain (e.g., `api.skylink.com`)
4. Follow Railway's DNS instructions
5. Update `VITE_CORE_API_URL` in Vercel with your custom domain

## Troubleshooting

### Backend Not Starting
- Check Railway logs: Service → **Deployments** → Click on deployment → **View Logs**
- Ensure `server/package.json` has correct `start` script
- Verify TypeScript build succeeds: `npm run build` works locally

### Frontend Can't Connect
- Verify `VITE_CORE_API_URL` is set in Vercel
- Check browser console for API errors
- Ensure Railway service is running (green status)
- Check CORS settings in `server/src/index.ts`

### CORS Errors
If you see CORS errors, ensure Railway URL is allowed:
- Check `server/src/index.ts` - CORS should allow all origins or your Vercel domain
- Railway provides HTTPS by default, which is good

### Port Issues
- Railway automatically assigns a port via `PORT` environment variable
- Your code should use `process.env.PORT || 4000`
- Don't hardcode port numbers

## Railway vs Render

### Advantages of Railway
- ✅ Faster deployments
- ✅ Better free tier
- ✅ Simpler configuration
- ✅ Better GitHub integration
- ✅ More predictable pricing

### Migration from Render
1. Keep Render service running during migration
2. Deploy to Railway
3. Update `VITE_CORE_API_URL` in Vercel
4. Test thoroughly
5. Once confirmed working, you can delete Render service

## Cost Estimate

Railway pricing (as of 2024):
- **Free tier**: $5 credit/month (usually enough for development)
- **Hobby plan**: $5/month + usage
- **Pro plan**: $20/month + usage

For a small production app, expect **$5-15/month** total.

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check Railway status: https://status.railway.app


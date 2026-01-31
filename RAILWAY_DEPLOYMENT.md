# Railway Deployment for Polymarket Agent

## Quick Deploy

### Option 1: Via Railway CLI (Recommended)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Authenticate
railway login

# 3. Link to this project
railway link

# 4. Deploy
railway up
```

### Option 2: Via Railway Dashboard
1. Go to https://railway.app
2. Sign up / Log in
3. Click "New Project" → "Deploy from GitHub"
4. Select your polymarket-agent repo
5. Railway auto-deploys on push!

---

## Environment Variables

Railway will use variables from your `.env` file. Make sure these are set:

```
POLYMARKET_API_KEY=your_api_key
POLYMARKET_PRIVATE_KEY=your_private_key
POLYMARKET_PASSPHRASE=your_passphrase
POLYMARKET_SECRET=your_secret
```

Set them in Railway Dashboard → Variables

---

## How It Works

- **Procfile**: Tells Railway how to start your app
  - Compiles TypeScript
  - Starts week-test in background (7-day automated trading)
  - Starts dashboard server (real-time monitoring)

- **railway.json**: Configuration for Railway
  - Auto-restart on crashes
  - Always-on service

- **.railwayignore**: Files to exclude from deployment

---

## Deployment Steps

### Step 1: Compile and Test Locally
```bash
npm run build
npm run start:live
```

### Step 2: Commit Changes
```bash
git add -A
git commit -m "Add Railway deployment configuration"
git push
```

### Step 3: Deploy via CLI
```bash
railway login
railway link
railway up
```

Or deploy via GitHub integration on Railway dashboard.

### Step 4: Access Your App
- Dashboard: `https://your-railway-app.up.railway.app`
- Logs: View in Railway dashboard

---

## Monitoring

View logs in Railway dashboard:
- Click your app
- Go to "Logs" tab
- See real-time output from week-test and dashboard

---

## Cost

Railway provides:
- **Free tier**: $5/month credit (usually covers small apps)
- **Usage**: ~$10-20/month for always-on Node.js app
- No surprises - set budget limits in dashboard

---

## Stopping/Restarting

Railway dashboard allows you to:
- Stop the deployment
- Restart with one click
- View all logs and metrics
- Set auto-restart policies

---

Happy deploying! 🚀

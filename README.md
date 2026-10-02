# 🏅 StravaBoard

A multi-discipline Strava leaderboard for you and your friends — running, cycling, swimming, gym workouts and more. Each person connects their own Strava account; scores are fetched live and stored in Upstash Redis. No activity data is persisted.

## Features

- 🔐 Each user logs in with their own Strava (OAuth)
- 📊 Personal dashboard — YTD stats + recent activities
- 🏆 Group leaderboard — weekly & monthly, sortable by points / distance / elevation
- 🏃🚴🏊🏋️ Multi-discipline scoring (runs, rides, swims, gym, hike, and 20+ more)
- ⚡ No database — only leaderboard scores are stored (auto-expire after 8 days)

## Scoring

| Sport | Points |
|---|---|
| Trail Run | 4 pts/km |
| Run | 3 pts/km |
| Hike | 2 pts/km |
| MTB / Gravel | 1.5 pts/km |
| Ride | 1 pt/km |
| Swim | 10 pts/km (1pt/100m) |
| Gym / CrossFit | 15 pts + 1pt per 10 min |
| Yoga / Pilates | 8 pts + time bonus |

---

## Setup

### 1. Strava API App

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Create or use your existing app
3. Set **Authorization Callback Domain** to your Render domain (e.g. `strava-leaderboard.onrender.com`)  
   For local dev use `localhost`
4. Note your **Client ID** and **Client Secret**

### 2. Upstash Redis (free)

1. Go to [console.upstash.com](https://console.upstash.com) and sign up (free, no card needed)
2. Click **Create Database** → choose a region close to your Render deployment
3. Copy the **REST URL** and **REST Token** from the REST API tab

### 3. Local Development

```bash
cd strava-leaderboard
npm install

# Copy env file and fill in your values
cp .env.example .env
# Edit .env with your Strava + Upstash credentials

npm run dev
# → http://localhost:3000
```

### 4. Deploy to Render

1. Push this folder to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create strava-leaderboard --public --push
   ```

2. Go to [render.com](https://render.com) → **New Web Service** → connect your GitHub repo

3. Render auto-detects `render.yaml`. Set these environment variables in the Render dashboard:
   | Variable | Value |
   |---|---|
   | `STRAVA_CLIENT_ID` | Your Strava Client ID |
   | `STRAVA_CLIENT_SECRET` | Your Strava Client Secret |
   | `BASE_URL` | `https://your-app.onrender.com` |
   | `UPSTASH_REDIS_REST_URL` | From Upstash dashboard |
   | `UPSTASH_REDIS_REST_TOKEN` | From Upstash dashboard |

4. After deploy, go to [strava.com/settings/api](https://www.strava.com/settings/api) and update the **Authorization Callback Domain** to `your-app.onrender.com`

5. Share the URL with friends — they just click **Connect with Strava** and they're in!

---

## How the leaderboard works

- Each user clicks **⚡ Sync my score** on the leaderboard page
- The app fetches their activities for the current week/month from Strava
- Scores are calculated and saved to Upstash Redis with an 8-day TTL
- Everyone on the leaderboard page sees all synced users ranked by score
- Scores auto-expire — inactive users fall off the board naturally

## Project Structure

```
strava-leaderboard/
├── src/
│   ├── server.js      # Express app entry point
│   ├── oauth.js       # Strava OAuth login/callback/logout
│   ├── strava.js      # Strava API client + token refresh
│   ├── scoring.js     # Multi-discipline points engine
│   ├── redis.js       # Upstash Redis REST client
│   └── routes.js      # API route handlers
├── public/
│   ├── index.html     # Single page app shell
│   ├── css/style.css  # Dark theme styles
│   └── js/
│       ├── app.js         # Bootstrap + routing + helpers
│       ├── dashboard.js   # Personal stats page
│       └── leaderboard.js # Group leaderboard page
├── .env.example
├── render.yaml
└── package.json
```

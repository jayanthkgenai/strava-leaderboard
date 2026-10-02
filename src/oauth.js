const express = require('express');
const axios = require('axios');
const router = express.Router();

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const SCOPES = 'read,activity:read_all,profile:read_all';

// Step 1: Redirect user to Strava authorization page
router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: `${BASE_URL}/auth/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: SCOPES,
  });
  res.redirect(`https://www.strava.com/oauth/authorize?${params}`);
});

// Step 2: Handle callback from Strava
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect('/?error=access_denied');
  }

  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_at, athlete } = response.data;

    // Store tokens in session
    req.session.athlete = {
      id: athlete.id,
      name: `${athlete.firstname} ${athlete.lastname}`,
      avatar: athlete.profile_medium,
      city: athlete.city,
      country: athlete.country,
    };
    req.session.tokens = { access_token, refresh_token, expires_at };

    // Save session explicitly before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect('/?error=session_failed');
      }
      res.redirect('/dashboard');
    });
  } catch (err) {
    console.error('OAuth callback error:', err.response?.data || err.message);
    res.redirect('/?error=auth_failed');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;

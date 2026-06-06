require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { generalLimiter } = require('./middleware/rateLimiter');
const FirestoreStore = require('./utils/firestoreSessionStore');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Trust Vercel's reverse proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);

app.use(cors({
  origin: isProduction ? false : (process.env.CLIENT_URL || 'http://localhost:5173'),
  credentials: true,
}));

app.use(express.json());

app.use(session({
  store: new FirestoreStore({ collection: 'sessions' }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 60 * 60 * 1000,
  },
}));

app.use(generalLimiter);

app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/public'));

module.exports = app;

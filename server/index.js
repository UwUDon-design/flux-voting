require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: isProduction ? false : (process.env.CLIENT_URL || 'http://localhost:5173'),
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 60 * 60 * 1000, // 60 minutes
  },
}));

app.use(generalLimiter);

app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/public'));

if (isProduction) {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

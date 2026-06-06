require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(cors({
  origin: isProduction ? false : (process.env.CLIENT_URL || 'http://localhost:5173'),
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(generalLimiter);

app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/public'));

module.exports = app;

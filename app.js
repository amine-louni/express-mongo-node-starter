const path = require('path');

const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const hpp = require('hpp');
const compression = require('compression');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/errorController');

const userRouter = require('./routes/userRoutes');

const app = express();

app.enable('trust proxy');

//GLOBALS MIDDLEWARES

// implement CORS (Access-Control-Allow-Origin *)
app.use(cors());
// Allow complex requests (DELETE , PATH , ...)
app.options('*', cors());

// Serving static files
app.use(express.static(path.join(__dirname, '/public')));

// Set security http headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser, reading data from the body to req.body
app.use(
  express.json({
    limit: '10kb',
  })
);
app.use(cookieParser());

// Data sanitization against no-sql query injections
app.use(mongoSanitize());

// Data sanitization against Cross-site-scripting attacks
app.use(xssClean());

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests , please try again in hour',
});

// Limiting the amount of requests
app.use('/api', limiter);

// Prevent parameters pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);
// Compression for texts
app.use(compression());
// Test middleware
app.use((req, res, next) => {
  req.requestedTime = new Date().toISOString();

  next();
});

// MOUNTING  ROUTERS

app.use('/api/v1/users', userRouter);

//Error Handling (if the route is not  of the previous ones (not found))
app.all('*', (req, res, next) => {
  // Passing The error to the globalError Handler
  next(new AppError(`can not find ${req.originalUrl} on this server`, 404));
});

// Global error handling
app.use(globalErrorHandler);
module.exports = app;

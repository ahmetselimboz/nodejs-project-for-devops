if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var rateLimit = require('express-rate-limit');

var mongoose = require('mongoose');
var Response = require('./lib/Response');
var { HTTP_CODES } = require('./config/Enum');
var CustomError = require('./lib/Error');
const { contextMiddleware } = require('./lib/logger/context');
const I18n = require('./lib/i18n');
const promBundle = require('express-prom-bundle');
const { errorCounter } = require('./lib/metrics');

// Register the global DB instrumentation plugin BEFORE any model is compiled
// (the route files below pull in the Mongoose models, so this must run first).
mongoose.plugin(require('./lib/dbMetricsPlugin'));

const i18n = new I18n();

var app = express();

// Disable x-powered-by to protect against framework fingerprinting
app.disable('x-powered-by');

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 1. Correlation ID Middleware (Run at the very top to cover the whole request context)
app.use(contextMiddleware);

// 2. Security Hardening Middleware
app.use(helmet());

// 3. Rate Limiting Middleware (IP based, general)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: {
      message: i18n.translate('COMMON.TOO_MANY_REQUESTS'),
      description: i18n.translate('COMMON.TOO_MANY_REQUESTS_DESCRIPTION')
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// 4. Stricter Rate Limiter for Auth (Brute-Force Protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      message: i18n.translate('COMMON.TOO_MANY_REQUESTS'),
      description: i18n.translate('COMMON.RATE_LIMIT_AUTH')
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/users/auth', authLimiter);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Prometheus Metrics Middleware
// This automatically registers the /metrics endpoint and collects HTTP request metrics
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  promClient: {
    collectDefaultMetrics: {}
  }
});
app.use(metricsMiddleware);

app.use('/api', require('./routes/index'));

// Catch 404 and forward to error handler
app.use(function(req, res) {
  return res.sendStatus(404);
});

// Centralized Global Error Handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Formulate the standardized error response
  const errorResponse = Response.errorResponse(err.code || err.status || 500, err, req.user?.language);
  
  // Increment error counter with the error type and status code
  errorCounter.inc({ 
    error_name: err.name || 'Error', 
    status_code: String(errorResponse.code) 
  });

  // Dynamically set the HTTP status code to align with the error payload status code!
  res.status(errorResponse.code);
  return res.json(errorResponse);
});

module.exports = app;

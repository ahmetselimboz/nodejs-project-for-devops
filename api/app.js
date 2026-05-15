if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var Response = require('./lib/Response');
var { HTTP_CODES } = require('./config/Enum');
var CustomError = require('./lib/Error');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', require('./routes/index'));


// catch 404 and forward to error handler
app.use(function(req, res) {
  return res.sendStatus(404);
});

// error handler
app.use(function(err, req, res) {

  // set locals, only providing error in development

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  return res.json(Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, err, req.user?.language));
});

module.exports = app;

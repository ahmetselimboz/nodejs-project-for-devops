var winston = require("winston");
const { LOG_LEVEL } = require("../../config/index");
const path = require('path');
const { getCorrelationId } = require('./context');

const colorizer = winston.format.colorize();

const buildLine = (info) => {
  const correlationId = getCorrelationId();
  return `${info.timestamp} ${info.level.toUpperCase()}: [ReqID:${correlationId}] [email:${info.message?.email || 'unknown'}] [location:${info.message?.location || 'unknown'}] [procType:${info.message?.proc_type || 'unknown'}] [log:${JSON.stringify(info.message?.log || info.message)}]`;
};

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.simple(),
  winston.format.splat(),
  winston.format.printf(buildLine)
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.splat(),
  winston.format.printf((info) => colorizer.colorize(info.level, buildLine(info)))
);

const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, "../../logs/info.log"), format: fileFormat }),
    new winston.transports.Console({ format: consoleFormat }),
  ],
});

module.exports = logger;

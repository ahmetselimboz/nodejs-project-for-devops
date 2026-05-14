var winston = require("winston");
const { LOG_LEVEL } = require("../../config/index");
const path = require('path');

const colorizer = winston.format.colorize();

const buildLine = (info) =>
  `${info.timestamp} ${info.level.toUpperCase()}: [email:${info.message.email}] [location:${info.message.location}] [procType:${info.message.proc_type}] [log:${JSON.stringify(info.message.log)}]`;

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

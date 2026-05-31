var winston = require("winston");
const { LOG_LEVEL } = require("../../config/index");
const path = require('path');
const { getCorrelationId } = require('./context');

// Log objesini yapılandırılmış (structured) formata çeviren custom format
const structuredFormat = winston.format((info) => {
  const correlationId = getCorrelationId();
  
  // Custom değişkenleri ana objeye atıyoruz, böylece JSON formatlandığında root seviyesinde field'lar olurlar
  info.correlationId = correlationId || null;
  info.email = info.message?.email || 'unknown';
  info.location = info.message?.location || 'unknown';
  info.procType = info.message?.proc_type || 'unknown';
  
  // Gerçek log mesajını ayarlıyoruz
  const logContent = info.message?.log || info.message;
  info.message = typeof logContent === 'object' ? JSON.stringify(logContent) : logContent;
  
  return info;
});

// JSON çıktı formatı (Loki gibi araçlar için)
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  structuredFormat(),
  winston.format.json()
);

// Geliştirme ortamı için okunabilir konsol formatı (Eski yapıya benzer)
const colorizer = winston.format.colorize();
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  structuredFormat(),
  winston.format.printf((info) => {
    return colorizer.colorize(info.level, `${info.timestamp} ${info.level.toUpperCase()}: [ReqID:${info.correlationId}] [email:${info.email}] [location:${info.location}] [procType:${info.procType}] [log:${info.message}]`);
  })
);

const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    // Dosyaya JSON formatında yazar
    new winston.transports.File({ 
      filename: path.join(__dirname, "../../logs/info.log"), 
      format: jsonFormat 
    }),
    // Eğer ortam PRODUCTION ise konsola da JSON yazar (Docker/K8s Log toplayıcıları için), aksi halde okunabilir string.
    new winston.transports.Console({ 
      format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat 
    }),
  ],
});

module.exports = logger;

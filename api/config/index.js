module.exports = {
  PORT: process.env.PORT || 3000,
  DB: {
    HOST: process.env.DB_HOST || '127.0.0.1',
    PORT: process.env.DB_PORT || 27017,
    NAME: process.env.DB_NAME || 'test',
  },
  CONNECTION_STRING: `mongodb://${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 27017}/${process.env.DB_NAME || 'test'}`,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  JWT: {
    SECRET: process.env.JWT_SECRET || 'secret',
    EXPIRE_TIME: !isNaN(parseInt(process.env.JWT_EXPIRE_TIME)) ? parseInt(process.env.JWT_EXPIRE_TIME) : 60*60*24,
  },
  DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE || 'EN',

};
const winston = require("winston");

let logger = null;

const CONSOLE_LEVEL = process.env.CONSOLE_LOGGER_LEVEL || "error";

const getLogger = (consoleLevel = null, logPath = "") => {
  if (!consoleLevel) {
    consoleLevel = CONSOLE_LEVEL;
  }

  if (logger) {
    return logger;
  }

  const prettyJson = winston.format.printf((info) => {
    if (typeof info.message === "object") {
      info.message = JSON.stringify(info.message, null, 4);
    }
    return `${info.timestamp} ${info.level} ${info.message}`;
  });

  logger = winston.createLogger({
    level: consoleLevel,
    transports: [],
  });
  if (process.env.NODE_ENV === "production") {
    logger.add(
      new winston.transports.File({
        filename: `${logPath}${process.env.NODE_ENV}.log`,
        format: winston.format.combine(
          winston.format.timestamp({
            format: "YYYY-MM-DD hh:mm:ss A ZZ",
          }),
          winston.format.json()
        ),
        level: "warning",
      })
    );
  } else {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({
            format: "HH:mm:ss.SSS",
          }),
          winston.format.prettyPrint(),
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.splat(),
          prettyJson
        ),
      })
    );
  }
  return logger;
};

module.exports = { getLogger };

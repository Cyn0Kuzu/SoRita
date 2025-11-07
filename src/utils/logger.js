// A simple logger utility
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const CURRENT_LOG_LEVEL = LogLevel.DEBUG; // Set to WARN or ERROR in production

const logger = {
  createServiceLogger: (serviceName) => ({
    debug: (...args) => {
      if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
        console.log(`[${serviceName}] DEBUG:`, ...args);
      }
    },
    info: (...args) => {
      if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
        console.info(`[${serviceName}] INFO:`, ...args);
      }
    },
    warn: (...args) => {
      if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
        console.warn(`[${serviceName}] WARN:`, ...args);
      }
    },
    error: (...args) => {
      if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
        console.error(`[${serviceName}] ERROR:`, ...args);
      }
    },
  }),
};

export { logger };
export default logger;

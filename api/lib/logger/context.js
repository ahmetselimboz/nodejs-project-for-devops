const { AsyncLocalStorage } = require('node:async_hooks');
const crypto = require('crypto');

// Create the AsyncLocalStorage instance
const loggerContext = new AsyncLocalStorage();

/**
 * Express Middleware to run the request within the AsyncLocalStorage context.
 * Generates a Correlation ID (UUID) if not already provided in request headers.
 */
const contextMiddleware = (req, res, next) => {
    // Read from 'x-correlation-id' header or generate a new UUID
    const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || crypto.randomUUID();
    
    // Set the Correlation ID response header so the client can trace it too
    res.setHeader('x-correlation-id', correlationId);

    // Run the request flow within the store
    const store = { correlationId };
    loggerContext.run(store, () => {
        next();
    });
};

/**
 * Helper to retrieve the current Correlation ID from the active store.
 * Returns 'N/A' if called outside an active request context.
 */
const getCorrelationId = () => {
    const store = loggerContext.getStore();
    return store ? store.correlationId : 'N/A';
};

module.exports = {
    contextMiddleware,
    getCorrelationId
};

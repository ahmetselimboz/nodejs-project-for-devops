const { BadRequestError } = require('../errors/AppErrors');

/**
 * Express middleware to validate incoming request data using a Zod schema.
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 */
const validate = (schema) => {
    return (req, res, next) => {
        try {
            // Validate and parse the request components
            const parsed = schema.parse({
                body: req.body,
                query: req.query,
                params: req.params
            });

            // Replace req with parsed values (ensures type safety and removes extra keys if configured)
            req.body = parsed.body || req.body;
            req.query = parsed.query || req.query;
            req.params = parsed.params || req.params;

            next();
        } catch (error) {
            // Map Zod errors to a readable and clean format
            const validationErrors = error.errors ? error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
            })) : error.message;

            // Pass a BadRequestError to the global error handler
            const errDescription = typeof validationErrors === 'object' 
                ? JSON.stringify(validationErrors) 
                : validationErrors;
                
            next(new BadRequestError(errDescription));
        }
    };
};

module.exports = validate;

const CustomError = require('../Error');
const { HTTP_CODES } = require('../../config/Enum');

class BadRequestError extends CustomError {
    constructor(description = 'Validation Error', message = 'COMMON.VALIDATION_ERROR') {
        super(HTTP_CODES.BAD_REQUEST, message, description);
    }
}

class UnauthorizedError extends CustomError {
    constructor(description = 'Unauthorized Access', message = 'COMMON.UNAUTHORIZED') {
        super(HTTP_CODES.UNAUTHORIZED, message, description);
    }
}

class ForbiddenError extends CustomError {
    constructor(description = 'Access Forbidden', message = 'COMMON.FORBIDDEN') {
        super(HTTP_CODES.FORBIDDEN, message, description);
    }
}

class NotFoundError extends CustomError {
    constructor(description = 'Resource Not Found', message = 'COMMON.NOT_FOUND') {
        super(HTTP_CODES.NOT_FOUND, message, description);
    }
}

class ConflictError extends CustomError {
    constructor(description = 'Record Already Exists', message = 'COMMON.ALREADY_EXISTS') {
        super(HTTP_CODES.CONFLICT, message, description);
    }
}

module.exports = {
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError
};

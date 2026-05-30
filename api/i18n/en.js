module.exports = {
    "SYSTEM": {
        "ERROR": "System Error",
        "ERROR_DESCRIPTION": "An error occurred while processing your request. Please try again later."
    },
    "COMMON": {
        "VALIDATION_ERROR": "Validation Error",
        "VALIDATION_ERROR_DESCRIPTION": "The request you made is invalid. Please check your request and try again.",
        "NOT_FOUND": "Not Found",
        "NOT_FOUND_DESCRIPTION": "The resource you are looking for does not exist.",
        "UNAUTHORIZED": "Unauthorized",
        "UNAUTHORIZED_DESCRIPTION": "You are not authorized to access this resource.",
        "FORBIDDEN": "Forbidden",
        "FORBIDDEN_DESCRIPTION": "You are not allowed to access this resource.",
        "INTERNAL_SERVER_ERROR": "Internal Server Error",
        "ALREADY_EXISTS": "Already exists!",
        "ALREADY_EXISTS_DESCRIPTION": "The record you are trying to create already exists.",
        "ID_REQUIRED": "_id is required",
        "FIELD_REQUIRED": "{0} is required",
        "TOO_MANY_REQUESTS": "Too Many Requests",
        "TOO_MANY_REQUESTS_DESCRIPTION": "Too many requests from this IP, please try again later.",
        "RATE_LIMIT_AUTH": "Too many failed login attempts. You have been blocked for 15 minutes."
    },
    "USERS": {
        "USER_NOT_FOUND": "User not found",
        "USER_NOT_FOUND_DESCRIPTION": "The user you are looking for does not exist.",
        "EMAIL_REQUIRED": "Email is required",
        "FIRST_NAME_REQUIRED": "First name is required",
        "LAST_NAME_REQUIRED": "Last name is required",
        "PHONE_NUMBER_REQUIRED": "Phone number is required",
        "PASSWORD_REQUIRED": "Password is required",
        "PASSWORD_MIN_LENGTH": "Password must be at least {0} characters long",
        "ROLES_REQUIRED": "Roles are required",
        "ROLES_NOT_FOUND": "One or more roles not found",
        "EMAIL_OR_PASSWORD_INVALID": "Email or password is invalid",
        "CREATE_SUCCESS": "User created successfully",
        "UPDATE_SUCCESS": "User updated successfully",
        "DELETE_SUCCESS": "User deleted successfully",
        "NEED_PERMISSION": "Need Permission",
        "DONT_HAVE_PERMISSION": "You dont have permission"
    },
    "CATEGORIES": {
        "NAME_REQUIRED": "Name is required",
        "NOT_FOUND": "Category not found",
        "NOT_FOUND_DESCRIPTION": "The category you are looking for does not exist.",
        "CREATE_SUCCESS": "Category created successfully",
        "UPDATE_SUCCESS": "Category updated successfully",
        "DELETE_SUCCESS": "Category deleted successfully"
    },
    "ROLES": {
        "ROLE_NAME_REQUIRED": "Role name is required",
        "PERMISSIONS_REQUIRED": "Permissions are required",
        "NOT_FOUND": "Role not found",
        "NOT_FOUND_DESCRIPTION": "The role you are looking for does not exist.",
        "CREATE_SUCCESS": "Role created successfully",
        "UPDATE_SUCCESS": "Role updated successfully",
        "DELETE_SUCCESS": "Role deleted successfully"
    },
    "AUDITLOGS": {
        "INVALID_LIMIT": "Limit must be a number and cannot exceed 500.",
        "INVALID_SKIP": "Skip must be a number.",
        "INVALID_SORT": "Sort must be an object.",
        "INVALID_DATE_RANGE": "Begin date and end date must both be provided."
    },
    "HEALTH": {
        "ALIVE": "I am alive!",
        "READY": "System is ready for traffic.",
        "DB_NOT_READY": "Database connection is not ready."
    }
}

const mongoose = require('mongoose');
const { PASSWORD_RULES, HTTP_CODES } = require('../../config/Enum');
const CustomError = require('../../lib/Error');
const bcrypt = require('bcrypt');

const schema = mongoose.Schema({
    first_name: String,
    last_name: String,
    phone_number: String,
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    is_active: {
        type: Boolean,
        default: true,
    }
}, { timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
}, versionKey: false });


class Users extends mongoose.Model {

    static validPassword(user, password) {
        return bcrypt.compareSync(password, user.password);
    }

    static validateFieldsBeforeAuth(email, password) {
        if(typeof password !== 'string' || password.length < PASSWORD_RULES.MIN_LENGTH ) {
            throw new CustomError(HTTP_CODES.UNAUTHORIZED, 'Validation Error', `Email or password is invalid`);
        }
        if(typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
            throw new CustomError(HTTP_CODES.UNAUTHORIZED, 'Validation Error', `Email or password is invalid`);
        }
        if(email.length > 255) {
            throw new CustomError(HTTP_CODES.UNAUTHORIZED, 'Validation Error', `Email or password is invalid`);
        }
        if(password.length > 255) {
            throw new CustomError(HTTP_CODES.UNAUTHORIZED, 'Validation Error', `Email or password is invalid`);
        }
        return null;
    }
}

schema.loadClass(Users);

module.exports = mongoose.model('Users', schema);
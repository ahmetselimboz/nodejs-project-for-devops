const mongoose = require('mongoose');
const { PASSWORD_RULES, HTTP_CODES } = require('../../config/Enum');
const config = require('../../config');
const CustomError = require('../../lib/Error');
const I18n = require('../../lib/i18n');

const i18n = new I18n();
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
    },
    language: {
        type: String,
        default: config.DEFAULT_LANGUAGE,
    }
}, { timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
}, versionKey: false });


class Users extends mongoose.Model {

    validPassword(password) {
        return bcrypt.compareSync(password, this.password);
    }

    static validateFieldsBeforeAuth(email, password, lang) {
        let message = i18n.translate('COMMON.VALIDATION_ERROR', lang);
        let description = i18n.translate('USERS.EMAIL_OR_PASSWORD_INVALID', lang);

        if(typeof password !== 'string' || password.length < PASSWORD_RULES.MIN_LENGTH ) {
            throw new CustomError(HTTP_CODES.UNAUTHORIZED, message, description);
        }
        if(typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
            throw new CustomError(HTTP_CODES.UNAUTHORIZED, message, description);
        }
        if(email.length > 255) {
            throw new CustomError(HTTP_CODES.UNAUTHORIZED, message, description);
        }
        if(password.length > 255) {
            throw new CustomError(HTTP_CODES.UNAUTHORIZED, message, description);
        }
        return null;
    }
}

schema.loadClass(Users);

module.exports = mongoose.model('Users', schema);
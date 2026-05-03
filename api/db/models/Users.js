const mongoose = require('mongoose');

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


class Users extends  mongoose.Model {

}

schema.loadClass(Users);

module.exports = mongoose.model('Users', schema);
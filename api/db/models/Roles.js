const mongoose = require('mongoose');

const schema = mongoose.Schema({
    role_name: {
        type: String,
        required: true,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }, versionKey: false
});


class Roles extends mongoose.Model {

}

schema.loadClass(Roles);

module.exports = mongoose.model('Roles', schema);
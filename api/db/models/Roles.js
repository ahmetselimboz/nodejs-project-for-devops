var RolePrivileges = require('./RolePrivileges');

const mongoose = require('mongoose');

const schema = mongoose.Schema({
    role_name: {
        type: String,
        required: true,
        unique: true,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,

    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }, versionKey: false
});


class Roles extends mongoose.Model {

    static async findByIdAndDelete(_id) {

        await RolePrivileges.deleteMany({ role_id: _id });
        await mongoose.model('user_roles').deleteMany({role_id: _id});
        return await super.findByIdAndDelete(_id);
    }
}

schema.loadClass(Roles);

module.exports = mongoose.model('Roles', schema);
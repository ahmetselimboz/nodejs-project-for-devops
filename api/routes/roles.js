var express = require('express');
var router = express.Router();

var Roles = require('../db/models/Roles');
var RolePrivileges = require('../db/models/RolePrivileges');

const Response = require('../lib/Response');
const { HTTP_CODES } = require('../config/Enum');
const CustomError = require('../lib/Error');
const rolePrivileges = require('../config/role_privileges');

/* GET users listing. */
router.get('/', async (req, res) => {
  try {
    const roles = await Roles.find();
    res.json(Response.successResponse(HTTP_CODES.OK, roles));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error);
    res.status(errorResponse.code).json(errorResponse);
  }
});


router.post('/add', async (req, res) => {
  let body = req.body;
  try {
    if (!body.role_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Role name is required');
    }
    if (!body.permissions || !Array.isArray(body.permissions) || body.permissions.length === 0) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Permissions are required');
    }

    let role = new Roles({
      role_name: body.role_name,
      created_by: req.user?.id
    });
    await role.save();


    for (let permission of body.permissions) {
      let rolePrivilege = new RolePrivileges({
        role_id: role._id,
        permission: permission,
        created_by: req.user?.id
      });
      await rolePrivilege.save();
    }

    res.json(Response.successResponse(HTTP_CODES.CREATED, 'Role created successfully'));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/update', async (req, res) => {
  let body = req.body;
  try {
    let updates = {};
    if (!body._id) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', '_id is required');
    }
    if (!body.role_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Role name is required');
    }

    if (body.role_name) updates.role_name = body.role_name;
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

    if (body.permissions && Array.isArray(body.permissions) && body.permissions.length > 0) {

      let permissions = await RolePrivileges.find({ role_id: body._id });

      let removedPermissions = permissions.filter(permission => !body.permissions.includes(permission.permission));
      let newPermissions = body.permissions.filter(permission => !permissions.map(p => p.permission).includes(permission));

      if (removedPermissions.length > 0) {
        await RolePrivileges.deleteMany({ _id: { $in: removedPermissions.map(p => p._id) } });
      }

      if (newPermissions.length > 0) {
        for (let permission of newPermissions) {
          let rolePrivilege = new RolePrivileges({
            role_id: body._id,
            permission: permission,
            created_by: req.user?.id
          });
          await rolePrivilege.save();
        }
      }
    }

    let role = await Roles.findByIdAndUpdate(body._id, updates, { new: true });

    if (!role) {
      throw new CustomError(HTTP_CODES.NOT_FOUND, 'Role not found');
    }

    res.json(Response.successResponse(HTTP_CODES.OK, 'Role updated successfully'));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/delete', async (req, res) => {
  let body = req.body;
  try {
    if (!body._id) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', '_id is required');
    }

    await Roles.findByIdAndDelete(body._id);

    res.json(Response.successResponse(HTTP_CODES.OK, 'Role deleted successfully'));

  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.get('/role-privileges', async (req, res) => {
  try {

    res.json(Response.successResponse(HTTP_CODES.OK, rolePrivileges));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error);
    res.status(errorResponse.code).json(errorResponse);
  }
});

module.exports = router;

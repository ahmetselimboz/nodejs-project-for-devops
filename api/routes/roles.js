var express = require('express');
var router = express.Router();

var Roles = require('../db/models/Roles');
var RolePrivileges = require('../db/models/RolePrivileges');
var UserRoles = require('../db/models/UserRoles');

const Response = require('../lib/Response');
const { HTTP_CODES } = require('../config/Enum');
const rolePrivilegesConfig = require('../config/role_privileges');
const auth = require('../lib/auth')();
const I18n = require('../lib/i18n');
const Auditlogs = require('../lib/Auditlogs');
const LoggerClass = require('../lib/logger/logger');
const catchAsync = require('../lib/utils/catchAsync');
const validate = require('../lib/middlewares/validate');
const { addRoleSchema, updateRoleSchema, deleteRoleSchema } = require('../lib/schemas/RoleSchemas');
const { NotFoundError } = require('../lib/errors/AppErrors');

const i18n = new I18n();

router.use(auth.authenticate());

/**
 * List all roles with their permissions
 */
router.get('/', auth.checkRoles('role_view'), catchAsync(async (req, res) => {
  const roles = await Roles.find();
  const allRolePrivileges = await RolePrivileges.find({});

  const roleData = roles.map(role => ({
    _id: role._id,
    role_name: role.role_name,
    permissions: allRolePrivileges
      .filter(rp => rp.role_id.toString() === role._id.toString())
      .map(rp => rp.permission)
  }));

  Response.successResponse(res, HTTP_CODES.OK, roleData);
}));

/**
 * Add a new role
 */
router.post('/add', auth.checkRoles('role_add'), validate(addRoleSchema), catchAsync(async (req, res) => {
  let body = req.body;
  let lang = req.user?.language;

  let role = new Roles({
    role_name: body.role_name,
    created_by: req.user?.id
  });
  await role.save();

  let savedPrivileges = [];
  for (let permission of body.permissions) {
    let rp = new RolePrivileges({
      role_id: role._id,
      permission: permission,
      created_by: req.user?.id
    });
    await rp.save();
    savedPrivileges.push(rp);
  }

  let roleData = { role, rolePrivileges: savedPrivileges };

  Auditlogs.info(req.user?.email, 'Roles', 'add', roleData);
  LoggerClass.info(req.user?.email, 'Roles', 'add', roleData);

  Response.successResponse(res, HTTP_CODES.CREATED, i18n.translate('ROLES.CREATE_SUCCESS', lang));
}));

/**
 * Update an existing role
 */
router.post('/update', auth.checkRoles('role_update'), validate(updateRoleSchema), catchAsync(async (req, res) => {
  let body = req.body;
  let lang = req.user?.language;
  let updates = {};

  if (body.role_name) updates.role_name = body.role_name;
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

  if (body.permissions && Array.isArray(body.permissions) && body.permissions.length > 0) {
    let existingPermissions = await RolePrivileges.find({ role_id: body._id });

    let removedPermissions = existingPermissions.filter(
      p => !body.permissions.includes(p.permission)
    );
    let newPermissions = body.permissions.filter(
      p => !existingPermissions.map(ep => ep.permission).includes(p)
    );

    if (removedPermissions.length > 0) {
      await RolePrivileges.deleteMany({ _id: { $in: removedPermissions.map(p => p._id) } });
    }

    for (let permission of newPermissions) {
      let rp = new RolePrivileges({
        role_id: body._id,
        permission: permission,
        created_by: req.user?.id
      });
      await rp.save();
    }
  }

  let role = await Roles.findByIdAndUpdate(body._id, updates, { new: true });
  if (!role) {
    throw new NotFoundError(i18n.translate('ROLES.NOT_FOUND_DESCRIPTION', lang));
  }

  Auditlogs.info(req.user?.email, 'Roles', 'update', updates);
  LoggerClass.info(req.user?.email, 'Roles', 'update', updates);

  Response.successResponse(res, HTTP_CODES.OK, i18n.translate('ROLES.UPDATE_SUCCESS', lang));
}));

/**
 * Delete a role and clean up related RolePrivileges and UserRoles (orphan cleanup)
 */
router.post('/delete', auth.checkRoles('role_delete'), validate(deleteRoleSchema), catchAsync(async (req, res) => {
  let body = req.body;
  let lang = req.user?.language;

  let role = await Roles.findByIdAndDelete(body._id);
  if (!role) {
    throw new NotFoundError(i18n.translate('ROLES.NOT_FOUND_DESCRIPTION', lang));
  }

  // Clean up orphan records from RolePrivileges and UserRoles
  await RolePrivileges.deleteMany({ role_id: body._id });
  await UserRoles.deleteMany({ role_id: body._id });

  Auditlogs.info(req.user?.email, 'Roles', 'delete', { id: body._id });
  LoggerClass.info(req.user?.email, 'Roles', 'delete', { id: body._id });

  Response.successResponse(res, HTTP_CODES.OK, i18n.translate('ROLES.DELETE_SUCCESS', lang));
}));

/**
 * Get all available role privilege definitions
 */
router.get('/role-privileges', auth.checkRoles('role_view'), catchAsync(async (req, res) => {
  Response.successResponse(res, HTTP_CODES.OK, rolePrivilegesConfig);
}));

module.exports = router;

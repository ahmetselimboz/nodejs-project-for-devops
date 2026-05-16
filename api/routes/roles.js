var express = require('express');
var router = express.Router();

var Roles = require('../db/models/Roles');
var RolePrivileges = require('../db/models/RolePrivileges');

const Response = require('../lib/Response');
const { HTTP_CODES } = require('../config/Enum');
const CustomError = require('../lib/Error');
const rolePrivileges = require('../config/role_privileges');
const auth = require('../lib/auth')();
const I18n = require('../lib/i18n');
const Auditlogs = require('../lib/Auditlogs');
const LoggerClass = require('../lib/logger/logger');

const i18n = new I18n();

router.use(auth.authenticate());

/* GET users listing. */
router.get('/', auth.checkRoles('role_view'), async (req, res) => {
  try {
    const roles = await Roles.find();
    let rolePrivileges = await RolePrivileges.find({ });
    let roleData = roles.map(role => {
      return {
        _id: role._id,
        role_name: role.role_name,
        permissions: rolePrivileges.filter(rp => rp.role_id.toString() === role._id.toString()).map(rp => rp.permission)
      };
    });



    res.json(Response.successResponse(HTTP_CODES.OK, roleData));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});


router.post('/add', auth.checkRoles('role_add'), async (req, res) => {
  let body = req.body;
  try {
    let lang = req.user?.language;
    if (!body.role_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('ROLES.ROLE_NAME_REQUIRED', lang));
    }
    if (!body.permissions || !Array.isArray(body.permissions) || body.permissions.length === 0) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('ROLES.PERMISSIONS_REQUIRED', lang));
    }

    let role = new Roles({
      role_name: body.role_name,
      created_by: req.user?.id
    });
    await role.save();


    for (let permission of body.permissions) {
      let rolePrivileges = new RolePrivileges({
        role_id: role._id,
        permission: permission,
        created_by: req.user?.id
      });
      await rolePrivileges.save();
    }

    let roleData = {
      role,
      rolePrivileges
    }

    Auditlogs.info(req.user?.email, 'Roles', 'add', roleData);
    LoggerClass.info(req.user?.email, 'Roles', 'add', roleData);

    res.json(Response.successResponse(HTTP_CODES.CREATED, i18n.translate('ROLES.CREATE_SUCCESS', lang)));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/update', auth.checkRoles('role_update'), async (req, res) => {
  let body = req.body;
  try {
    let lang = req.user?.language;
    let updates = {};
    if (!body._id) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('COMMON.ID_REQUIRED', lang));
    }
    if (!body.role_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('ROLES.ROLE_NAME_REQUIRED', lang));
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

    Auditlogs.info(req.user?.email, 'Roles', 'update', updates);
    LoggerClass.info(req.user?.email, 'Roles', 'update', updates);

    if (!role) {
      throw new CustomError(HTTP_CODES.NOT_FOUND, i18n.translate('ROLES.NOT_FOUND', lang));
    }

    res.json(Response.successResponse(HTTP_CODES.OK, i18n.translate('ROLES.UPDATE_SUCCESS', lang)));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/delete', auth.checkRoles('role_delete'), async (req, res) => {
  let body = req.body;
  try {
    let lang = req.user?.language;
    if (!body._id) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('COMMON.ID_REQUIRED', lang));
    }

    await Roles.findByIdAndDelete(body._id);

    Auditlogs.info(req.user?.email, 'Roles', 'delete', {id: body._id});
    LoggerClass.info(req.user?.email, 'Roles', 'delete', {id: body._id});

    res.json(Response.successResponse(HTTP_CODES.OK, i18n.translate('ROLES.DELETE_SUCCESS', lang)));

  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.get('/role-privileges', auth.checkRoles('role_view'), async (req, res) => {
  try {

    res.json(Response.successResponse(HTTP_CODES.OK, rolePrivileges));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

module.exports = router;

var express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jwt-simple');
const Response = require('../lib/Response');
const { HTTP_CODES, PASSWORD_RULES, SUPER_ADMIN } = require('../config/Enum');
const CustomError = require('../lib/Error');
const { NotFoundError, BadRequestError } = require('../lib/errors/AppErrors');
const Users = require('../db/models/Users');
const Roles = require('../db/models/Roles');
const UserRoles = require('../db/models/UserRoles');
const RolePrivileges = require('../db/models/RolePrivileges');
const config = require('../config');
const auth = require('../lib/auth')();
const I18n = require('../lib/i18n');
const Auditlogs = require('../lib/Auditlogs');
const LoggerClass = require('../lib/logger/logger');
const validate = require('../lib/middlewares/validate');
const { registerSchema, authSchema, addSchema, updateSchema, deleteSchema } = require('../lib/schemas/UserSchemas');
const catchAsync = require('../lib/utils/catchAsync');
const { loginAttemptsCounter, registrationsCounter } = require('../lib/metrics');

const i18n = new I18n();
var router = express.Router();

/**
 * 1. Register Route
 * Used to bootstrap the first user as SUPER_ADMIN.
 */
router.post('/register', validate(registerSchema), catchAsync(async (req, res) => {
  let body = req.body;

  let userExists = await Users.findOne({});
  if (userExists) {
    throw new NotFoundError(i18n.translate('COMMON.NOT_FOUND_DESCRIPTION', req.user?.language));
  }

  let hashedPassword = await bcrypt.hashSync(body.password, bcrypt.genSaltSync(PASSWORD_RULES.SALT_ROUNDS), null);

  let user = new Users({
    email: body.email,
    password: hashedPassword,
    first_name: body.first_name,
    last_name: body.last_name,
    phone_number: body.phone_number,
  });

  await user.save();

  let role = new Roles({
    role_name: SUPER_ADMIN,
    is_active: true,
    created_by: user._id
  });

  await role.save();

  let userRole = new UserRoles({
    user_id: user._id,
    role_id: role._id,
    created_by: user._id
  });

  await userRole.save();

let permissions = [
  "user_view",
  "user_add",
  "user_update",
  "user_delete",
  "role_view",
  "role_add",
  "role_update",
  "role_delete",
  "category_view",
  "category_add",
  "category_update",
  "category_delete",
  "category_export",
  "auditlogs_view",
  "auditlogs_add",
  "auditlogs_update",
  "auditlogs_delete"
];


  let existingPermissions = await RolePrivileges.find({ role_id: role._id });

  let removedPermissions = existingPermissions.filter(
    p => !permissions.includes(p.permission)
  );
  let newPermissions = permissions.filter(
    p => !existingPermissions.map(ep => ep.permission).includes(p)
  );

  if (removedPermissions.length > 0) {
    await RolePrivileges.deleteMany({ _id: { $in: removedPermissions.map(p => p._id) } });
  }

  for (let permission of newPermissions) {
    let rp = new RolePrivileges({
      role_id: role._id,
      permission: permission,
      created_by: user._id
    });
    await rp.save();
  }

  // Increment registrations counter
  registrationsCounter.inc({ role: SUPER_ADMIN });

  Response.successResponse(res, HTTP_CODES.CREATED, i18n.translate('USERS.CREATE_SUCCESS', req.user?.language));
}));

/**
 * 2. Auth (Login) Route
 */
router.post('/auth', validate(authSchema), catchAsync(async (req, res) => {
  let lang = req.user?.language;
  let { email, password } = req.body;

  // DB operation duration is tracked globally via the Mongoose metrics plugin.
  let user = await Users.findOne({ email: email });

  if (!user || !user.validPassword(password)) {
    loginAttemptsCounter.inc({ status: 'failure' });
    throw new CustomError(HTTP_CODES.UNAUTHORIZED, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.EMAIL_OR_PASSWORD_INVALID', lang));
  }

  loginAttemptsCounter.inc({ status: 'success' });

  let payload = {
    id: user._id,
    exp: parseInt(Date.now() / 1000) + parseInt(config.JWT.EXPIRE_TIME)
  };

  let token = jwt.encode(payload, config.JWT.SECRET);

  let userData = {
    _id: user._id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone_number: user.phone_number,
  };

  let userRoles = await UserRoles.find({ user_id: user._id });
  let roles = await Roles.find({ _id: { $in: userRoles.map(ur => ur.role_id) } });
  userData.roles = roles.map(r => r.role_name);

  Response.successResponse(res, HTTP_CODES.OK, {
    user: userData,
    token: token
  });
}));

// Apply authentication middleware for all subsequent routes
router.use(auth.authenticate());

/**
 * 3. List Users Route
 */
router.get('/', auth.checkRoles('user_view'), catchAsync(async (req, res) => {
  const users = await Users.find();
  const userIds = users.map(u => u._id);

  const userRoles = await UserRoles.find({
    user_id: { $in: userIds }
  });

  const roleIds = userRoles.map(ur => ur.role_id);
  const roles = await Roles.find({ _id: { $in: roleIds } });
  const allRolePrivileges = await RolePrivileges.find({ role_id: { $in: roleIds } });

  const userData = users.map(user => {
    const currentUserRoles = userRoles.filter(
      ur => ur.user_id.toString() === user._id.toString()
    );

    const rolesObject = {};

    currentUserRoles.forEach(userRole => {
      const role = roles.find(
        r => r._id.toString() === userRole.role_id.toString()
      );

      if (!role) return;

      const permissions = allRolePrivileges
        .filter(rp => rp.role_id.toString() === role._id.toString())
        .map(rp => rp.permission);

      rolesObject[role.role_name] = permissions;
    });

    return {
      _id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      language: user?.language,
      roles: rolesObject
    };
  });

  Response.successResponse(res, HTTP_CODES.OK, userData);
}));

/**
 * 4. Add User Route
 */
router.post('/add', auth.checkRoles('user_add'), validate(addSchema), catchAsync(async (req, res) => {
  let body = req.body;
  let lang = req.user?.language;

  let roles = await Roles.find({ _id: { $in: body.roles } });
  if (roles.length !== body.roles.length) {
    throw new NotFoundError(i18n.translate('USERS.ROLES_NOT_FOUND', lang));
  }

  let hashedPassword = await bcrypt.hashSync(body.password, bcrypt.genSaltSync(PASSWORD_RULES.SALT_ROUNDS), null);

  let user = new Users({
    email: body.email,
    password: hashedPassword,
    first_name: body.first_name,
    last_name: body.last_name,
    phone_number: body.phone_number,
    language: body.language
  });
  await user.save();

  for (let role of roles) {
    let userRole = new UserRoles({
      user_id: user._id,
      role_id: role._id,
    });
    await userRole.save();
  }

  // Increment registrations counter for each role added
  roles.forEach(r => registrationsCounter.inc({ role: r.role_name }));

  Auditlogs.info(req.user?.email, 'Users', 'add', user);
  LoggerClass.info(req.user?.email, 'Users', 'add', user);

  Response.successResponse(res, HTTP_CODES.CREATED, i18n.translate('USERS.CREATE_SUCCESS', req.user?.language));
}));

/**
 * 5. Update User Route
 */
router.post('/update', auth.checkRoles('user_update'), validate(updateSchema), catchAsync(async (req, res) => {
  let body = req.body;
  let lang = req.user?.language;
  let updates = {};

  if (body.roles && Array.isArray(body.roles) && body.roles.length > 0) {
    let userRoles = await UserRoles.find({ user_id: body._id });

    let removedRoles = userRoles.filter(role => !body.roles.includes(role.role_id.toString()));
    let newRoles = body.roles.filter(role => !userRoles.map(r => r.role_id.toString()).includes(role));

    if (removedRoles.length > 0) {
      await UserRoles.deleteMany({ _id: { $in: removedRoles.map(r => r._id.toString()) } });
    }

    if (newRoles.length > 0) {
      for (let role of newRoles) {
        let userRole = new UserRoles({
          user_id: body._id,
          role_id: role,
        });
        await userRole.save();
      }
    }
  }

  if (body.password) {
    let hashedPassword = await bcrypt.hashSync(body.password, bcrypt.genSaltSync(PASSWORD_RULES.SALT_ROUNDS), null);
    updates.password = hashedPassword;
  }

  if (body.first_name) updates.first_name = body.first_name;
  if (body.last_name) updates.last_name = body.last_name;
  if (body.phone_number) updates.phone_number = body.phone_number;
  if (body.email) updates.email = body.email;
  if (body.language) updates.language = body.language;

  const user = await Users.findByIdAndUpdate(body._id, updates, { new: true });
  if (!user) {
    throw new NotFoundError(i18n.translate('USERS.USER_NOT_FOUND', lang));
  }

  Auditlogs.info(req.user?.email, 'Users', 'update', user);
  LoggerClass.info(req.user?.email, 'Users', 'update', user);

  Response.successResponse(res, HTTP_CODES.OK, i18n.translate('USERS.UPDATE_SUCCESS', lang));
}));

/**
 * 6. Delete User Route
 */
router.post('/delete', auth.checkRoles('user_delete'), validate(deleteSchema), catchAsync(async (req, res) => {
  let body = req.body;
  let lang = req.user?.language;

  const user = await Users.findByIdAndDelete(body._id);
  if (!user) {
    throw new NotFoundError(i18n.translate('USERS.USER_NOT_FOUND', lang));
  }

  await UserRoles.deleteMany({ user_id: body._id });

  Auditlogs.info(req.user?.email, 'Users', 'delete', { id: body._id });
  LoggerClass.info(req.user?.email, 'Users', 'delete', { id: body._id });

  Response.successResponse(res, HTTP_CODES.OK, i18n.translate('USERS.DELETE_SUCCESS', lang));
}));

module.exports = router;

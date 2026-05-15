var express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jwt-simple');
const Response = require('../lib/Response');
const { HTTP_CODES, PASSWORD_RULES, SUPER_ADMIN } = require('../config/Enum');
const CustomError = require('../lib/Error');
const Users = require('../db/models/Users');
const Roles = require('../db/models/Roles');
const UserRoles = require('../db/models/UserRoles');
const RolePrivileges = require('../db/models/RolePrivileges');
const config = require('../config');
const auth = require('../lib/auth')();
const I18n = require('../lib/i18n');

const i18n = new I18n();

var router = express.Router();

router.post('/register', async (req, res) => {
  let body = req.body;
  try {

    let userExists = await Users.findOne({});
    if (userExists) {
      return res.sendStatus(HTTP_CODES.NOT_FOUND);
    }


    let lang = req.user?.language;

    if (!body.email) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.EMAIL_REQUIRED', lang));
    }
    if (!body.first_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.FIRST_NAME_REQUIRED', lang));
    }
    if (!body.last_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.LAST_NAME_REQUIRED', lang));
    }
    if (!body.phone_number) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.PHONE_NUMBER_REQUIRED', lang));
    }
    if (!body.password) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.PASSWORD_REQUIRED', lang));
    }
    if (body.password.length < PASSWORD_RULES.MIN_LENGTH) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.PASSWORD_MIN_LENGTH', lang).replace('{0}', PASSWORD_RULES.MIN_LENGTH));
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



    res.json(Response.successResponse(HTTP_CODES.CREATED, i18n.translate('USERS.CREATE_SUCCESS', req.user?.language)));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }

});

router.post('/auth', async (req, res) => {

  try {

    let lang = req.user?.language;
    let { email, password } = req.body;

    Users.validateFieldsBeforeAuth(email, password, lang);

    let user = await Users.findOne({ email: email });

    if (!user) throw new CustomError(HTTP_CODES.UNAUTHORIZED, i18n.translate('USERS.EMAIL_OR_PASSWORD_INVALID', lang));

    if (!user.validPassword(password)) throw new CustomError(HTTP_CODES.UNAUTHORIZED, i18n.translate('USERS.EMAIL_OR_PASSWORD_INVALID', lang));

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

    res.json(Response.successResponse(HTTP_CODES.OK, {
      user: userData,
      token: token
    }));

  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.use(auth.authenticate());

/* GET users listing. */
router.get('/', auth.checkRoles('user_view'), async (req, res) => {
  try {

    const users = await Users.find();

    const userIds = users.map(u => u._id);

    const userRoles = await UserRoles.find({
      user_id: { $in: userIds }
    });

    const roleIds = userRoles.map(ur => ur.role_id);

    const roles = await Roles.find({
      _id: { $in: roleIds }
    });

    const allRolePrivileges = await RolePrivileges.find({
      role_id: { $in: roleIds }
    });

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
          .filter(
            rp => rp.role_id.toString() === role._id.toString()
          )
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

    res.json(
      Response.successResponse(HTTP_CODES.OK, userData)
    );

  } catch (error) {

    const errorResponse = Response.errorResponse(
      HTTP_CODES.INT_SERVER_ERROR,
      error,
      req.user?.language
    );

    res
      .status(errorResponse.code)
      .json(errorResponse);
  }
});

router.post('/add', auth.checkRoles('user_add'), async (req, res) => {
  let body = req.body;
  try {

    let lang = req.user?.language;

    if (!body.email) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.EMAIL_REQUIRED', lang));
    }
    if (!body.first_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.FIRST_NAME_REQUIRED', lang));
    }
    if (!body.last_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.LAST_NAME_REQUIRED', lang));
    }
    if (!body.phone_number) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.PHONE_NUMBER_REQUIRED', lang));
    }
    if (!body.password) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.PASSWORD_REQUIRED', lang));
    }
    if (body.password.length < PASSWORD_RULES.MIN_LENGTH) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.PASSWORD_MIN_LENGTH', lang).replace('{0}', PASSWORD_RULES.MIN_LENGTH));
    }

    if (body.roles && !Array.isArray(body.roles) || body.roles.length === 0) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.ROLES_REQUIRED', lang));
    }

    let roles = await Roles.find({ _id: { $in: body.roles } });

    if (roles.length !== body.roles.length) {
      throw new CustomError(HTTP_CODES.NOT_FOUND, i18n.translate('USERS.ROLES_NOT_FOUND', lang));
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

    res.json(Response.successResponse(HTTP_CODES.CREATED, i18n.translate('USERS.CREATE_SUCCESS', req.user?.language)));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }

});


router.post('/update', auth.checkRoles('user_update'), async (req, res) => {
  let body = req.body;
  try {
    let lang = req.user?.language;
    let updates = {};
    if (!body._id) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('COMMON.ID_REQUIRED', lang));
    }
    if (!body.email) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.EMAIL_REQUIRED', lang));
    }
    if (!body.first_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.FIRST_NAME_REQUIRED', lang));
    }
    if (!body.last_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.LAST_NAME_REQUIRED', lang));
    }
    if (!body.phone_number) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.PHONE_NUMBER_REQUIRED', lang));
    }
    if (body.password.length < PASSWORD_RULES.MIN_LENGTH) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.PASSWORD_MIN_LENGTH', lang).replace('{0}', PASSWORD_RULES.MIN_LENGTH));
    }
    if (!body.password) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('USERS.PASSWORD_REQUIRED', lang));
    }

    if (body.roles && Array.isArray(body.roles) && body.roles.length > 0) {

      let userRoles = await UserRoles.find({ user_id: body._id });

      let removedRoles = userRoles.filter(role => !body.roles.includes(role.role_id.toString()));
      let newRoles = body.roles.filter(role => !userRoles.map(r => r.role_id).includes(role));

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


    let hashedPassword = await bcrypt.hashSync(body.password, bcrypt.genSaltSync(PASSWORD_RULES.SALT_ROUNDS), null);
    updates.password = hashedPassword;
    if (body.first_name) updates.first_name = body.first_name;
    if (body.last_name) updates.last_name = body.last_name;
    if (body.phone_number) updates.phone_number = body.phone_number;
    if (body.email) updates.email = body.email;
    if (body.language) updates.language = body.language;


    const user = await Users.findByIdAndUpdate(body._id, updates, { new: true });
    if (!user) {
      throw new CustomError(HTTP_CODES.NOT_FOUND, i18n.translate('USERS.USER_NOT_FOUND', lang));
    }
    res.json(Response.successResponse(HTTP_CODES.OK, i18n.translate('USERS.UPDATE_SUCCESS', lang)));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});


router.post('/delete', auth.checkRoles('user_delete'), async (req, res) => {
  let body = req.body;
  try {
    let lang = req.user?.language;
    if (!body._id) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('COMMON.ID_REQUIRED', lang));
    }
    await Users.findByIdAndDelete(body._id);
    await UserRoles.deleteMany({ user_id: body._id });
    res.json(Response.successResponse(HTTP_CODES.OK, i18n.translate('USERS.DELETE_SUCCESS', lang)));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});




module.exports = router;

var express = require('express');
const bcrypt = require('bcrypt');

const Response = require('../lib/Response');
const { HTTP_CODES, PASSWORD_RULES, SUPER_ADMIN } = require('../config/Enum');
const CustomError = require('../lib/Error');
const Users = require('../db/models/Users');
const Roles = require('../db/models/Roles');
const UserRoles = require('../db/models/UserRoles');

var router = express.Router();

/* GET users listing. */
router.get('/', async (req, res) => {
  try {
    const users = await Users.find();
    res.json(Response.successResponse(HTTP_CODES.OK, users));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/add', async (req, res) => {
  let body = req.body;
  try {

    if (!body.email) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Email is required');
    }
    if (!body.first_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'First name is required');
    }
    if (!body.last_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Last name is required');
    }
    if (!body.phone_number) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Phone number is required');
    }
    if (!body.password) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Password is required');
    }
    if (body.password.length < PASSWORD_RULES.MIN_LENGTH) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', `Password must be at least ${PASSWORD_RULES.MIN_LENGTH} characters long`);
    }

    if (body.roles && !Array.isArray(body.roles) || body.roles.length === 0) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Roles are required');
    }

    let roles = await Roles.find({ _id: { $in: body.roles } });

    if (roles.length !== body.roles.length) {
      throw new CustomError(HTTP_CODES.NOT_FOUND, 'One or more roles not found');
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

    for (let role of roles) {
      let userRole = new UserRoles({
        user_id: user._id,
        role_id: role._id,

      });
      await userRole.save();
    }

    res.json(Response.successResponse(HTTP_CODES.CREATED, "User created successfully"));
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
    if (!body.email) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Email is required');
    }
    if (!body.first_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'First name is required');
    }
    if (!body.last_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Last name is required');
    }
    if (!body.phone_number) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Phone number is required');
    }
    if (body.password.length < PASSWORD_RULES.MIN_LENGTH) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', `Password must be at least ${PASSWORD_RULES.MIN_LENGTH} characters long`);
    }
    if (!body.password) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Password is required');
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

    const user = await Users.findByIdAndUpdate(body._id, updates, { new: true });
    if (!user) {
      throw new CustomError(HTTP_CODES.NOT_FOUND, 'User not found');
    }
    res.json(Response.successResponse(HTTP_CODES.OK, "User updated successfully"));
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
    await Users.findByIdAndDelete(body._id);
    await UserRoles.deleteMany({ user_id: body._id });
    res.json(Response.successResponse(HTTP_CODES.OK, "User deleted successfully"));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/register', async (req, res) => {
  let body = req.body;
  try {

    let userExists = await Users.findOne({});
    if (userExists) {
      return res.sendStatus(HTTP_CODES.NOT_FOUND);
    }


    if (!body.email) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Email is required');
    }
    if (!body.first_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'First name is required');
    }
    if (!body.last_name) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Last name is required');
    }
    if (!body.phone_number) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Phone number is required');
    }
    if (!body.password) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Password is required');
    }
    if (body.password.length < PASSWORD_RULES.MIN_LENGTH) {
      throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', `Password must be at least ${PASSWORD_RULES.MIN_LENGTH} characters long`);
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



    res.json(Response.successResponse(HTTP_CODES.CREATED, "User created successfully"));
  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error);
    res.status(errorResponse.code).json(errorResponse);
  }

});


module.exports = router;

const express = require('express');
const router = express.Router();
const Categories = require('../db/models/Categories');
const Response = require('../lib/Response');
const { HTTP_CODES } = require('../config/Enum');
const Auditlogs = require('../lib/Auditlogs');
const LoggerClass = require('../lib/logger/logger');
const auth = require('../lib/auth')();
const I18n = require('../lib/i18n');
const catchAsync = require('../lib/utils/catchAsync');
const validate = require('../lib/middlewares/validate');
const { addCategorySchema, updateCategorySchema, deleteCategorySchema } = require('../lib/schemas/CategorySchemas');
const { NotFoundError } = require('../lib/errors/AppErrors');

const i18n = new I18n();

router.use(auth.authenticate());

/**
 * List all categories
 */
router.get('/', auth.checkRoles('category_view'), catchAsync(async (req, res) => {
  const categories = await Categories.find();
  Response.successResponse(res, HTTP_CODES.OK, categories);
}));

/**
 * Add a new category
 */
router.post('/add', auth.checkRoles('category_add'), validate(addCategorySchema), catchAsync(async (req, res) => {
  let body = req.body;
  let lang = req.user?.language;

  let category = new Categories({
    name: body.name,
    created_by: req.user?.id
  });
  await category.save();

  Auditlogs.info(req.user?.email, 'Categories', 'add', category.toObject());
  LoggerClass.info(req.user?.email, 'Categories', 'add', category.toObject());

  res.json(Response.successResponse(HTTP_CODES.CREATED, i18n.translate('CATEGORIES.CREATE_SUCCESS', lang)));
}));

/**
 * Update an existing category
 */
router.post('/update', auth.checkRoles('category_update'), validate(updateCategorySchema), catchAsync(async (req, res) => {
  let body = req.body;
  let lang = req.user?.language;
  let updates = {};

  if (body.name) updates.name = body.name;
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

  let category = await Categories.findByIdAndUpdate(body._id, updates, { new: true });
  if (!category) {
    throw new NotFoundError(i18n.translate('CATEGORIES.NOT_FOUND_DESCRIPTION', lang));
  }

  Auditlogs.info(req.user?.email, 'Categories', 'update', { _id: body._id, ...updates });
  LoggerClass.info(req.user?.email, 'Categories', 'update', { _id: body._id, ...updates });

  res.json(Response.successResponse(HTTP_CODES.OK, i18n.translate('CATEGORIES.UPDATE_SUCCESS', lang)));
}));

/**
 * Delete a category
 */
router.post('/delete', auth.checkRoles('category_delete'), validate(deleteCategorySchema), catchAsync(async (req, res) => {
  let body = req.body;
  let lang = req.user?.language;

  let category = await Categories.findByIdAndDelete(body._id);
  if (!category) {
    throw new NotFoundError(i18n.translate('CATEGORIES.NOT_FOUND_DESCRIPTION', lang));
  }

  Auditlogs.info(req.user?.email, 'Categories', 'delete', { _id: body._id });
  LoggerClass.info(req.user?.email, 'Categories', 'delete', { _id: body._id });

  res.json(Response.successResponse(HTTP_CODES.OK, i18n.translate('CATEGORIES.DELETE_SUCCESS', lang)));
}));

module.exports = router;
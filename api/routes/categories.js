const express = require('express');
const router = express.Router();
const Categories = require('../db/models/Categories');
const Response = require('../lib/Response');
const { HTTP_CODES } = require('../config/Enum');
const CustomError = require('../lib/Error');
const Auditlogs = require('../lib/Auditlogs');
const LoggerClass = require('../lib/logger/logger');
const auth = require('../lib/auth')();
const I18n = require('../lib/i18n');

const i18n = new I18n();

router.use(auth.authenticate());

router.get('/', auth.checkRoles('category_view'), async (req, res) => {

    try {
        const categories = await Categories.find();
        res.json(Response.successResponse(HTTP_CODES.OK, categories));
    } catch (error) {
        let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
        res.status(errorResponse.code).json(errorResponse);
    }

});

router.post('/add', auth.checkRoles('category_add'), async (req, res) => {
    let body = req.body;
    try {
        let lang = req.user?.language;
        if (!body.name) {
            throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('CATEGORIES.NAME_REQUIRED', lang));
        }

        let category = new Categories({
            name: body.name,
            created_by: req.user?.id
        });
        await category.save();
        Auditlogs.info(req.user?.email, 'Categories', 'add', category.toObject());
        LoggerClass.info(req.user?.email, 'Categories', 'add', category.toObject());

        res.json(Response.successResponse(HTTP_CODES.CREATED, i18n.translate('CATEGORIES.CREATE_SUCCESS', req.user?.language)));

    } catch (error) {

        let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);

        res.status(errorResponse.code).json(errorResponse);
    }
});


router.post('/update', auth.checkRoles('category_update'), async (req, res) => {

    let body = req.body;

    try {

        let lang = req.user?.language;

        if (!body._id) {
            throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('COMMON.ID_REQUIRED', lang));
        }

        let updates = {};

        if (!body.name) {
            throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('CATEGORIES.NAME_REQUIRED', lang));
        }

        if (body.name) updates.name = body.name;
        if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

        let category = await Categories.findByIdAndUpdate(body._id, updates, { new: true });

        if (!category) {
            throw new CustomError(HTTP_CODES.NOT_FOUND, i18n.translate('CATEGORIES.NOT_FOUND', lang));
        }

        Auditlogs.info(req.user?.email, 'Categories', 'update', {_id:body._id, ...updates});
        LoggerClass.info(req.user?.email, 'Categories', 'update', {_id:body._id, ...updates});

        res.json(Response.successResponse(HTTP_CODES.OK, i18n.translate('CATEGORIES.UPDATE_SUCCESS', lang)));
    } catch (error) {
        let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.post('/delete', auth.checkRoles('category_delete'), async (req, res) => {
    let body = req.body;
    try {
        let lang = req.user?.language;
        if (!body._id) {
            throw new CustomError(HTTP_CODES.BAD_REQUEST, i18n.translate('COMMON.VALIDATION_ERROR', lang), i18n.translate('COMMON.ID_REQUIRED', lang));
        }
        let category = await Categories.findByIdAndDelete(body._id);
        if (!category) {
            throw new CustomError(HTTP_CODES.NOT_FOUND, i18n.translate('CATEGORIES.NOT_FOUND', lang));
        }
        Auditlogs.info(req.user?.email, 'Categories', 'delete', {_id:body._id});
        LoggerClass.info(req.user?.email, 'Categories', 'delete', {_id:body._id});
        res.json(Response.successResponse(HTTP_CODES.OK, i18n.translate('CATEGORIES.DELETE_SUCCESS', lang)));
    } catch (error) {
        let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error, req.user?.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});

module.exports = router;
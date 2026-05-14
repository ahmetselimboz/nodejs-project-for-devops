const express = require('express');
const router = express.Router();
const Categories = require('../db/models/Categories');
const Response = require('../lib/Response');
const { HTTP_CODES } = require('../config/Enum');
const CustomError = require('../lib/Error');
const Auditlogs = require('../lib/Auditlogs');
const LoggerClass = require('../lib/logger/logger');

router.get('/', async (req, res) => {

    try {
        const categories = await Categories.find();
        res.json(Response.successResponse(HTTP_CODES.OK, categories));
    } catch (error) {
        let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error);
        res.status(errorResponse.code).json(errorResponse);
    }

});

router.post('/add', async (req, res) => {
    let body = req.body;
    try {
        if (!body.name) {
            throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Name is required');
        }

        let category = new Categories({
            name: body.name,
            created_by: req.user?.id
        });
        await category.save();
        Auditlogs.info(req.user?.email, 'Categories', 'add', category.toObject());
        LoggerClass.info(req.user?.email, 'Categories', 'add', category.toObject());

        res.json(Response.successResponse(HTTP_CODES.CREATED, 'Category created successfully'));

    } catch (error) {

        let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error);

        res.status(errorResponse.code).json(errorResponse);
    }
});


router.post('/update', async (req, res) => {

    let body = req.body;

    try {

        if (!body._id) {
            throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', '_id is required');
        }

        let updates = {};

        if (!body.name) {
            throw new CustomError(HTTP_CODES.BAD_REQUEST, 'Validation Error', 'Name is required');
        }

        if (body.name) updates.name = body.name;
        if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

        let category = await Categories.findByIdAndUpdate(body._id, updates, { new: true });

        if (!category) {
            throw new CustomError(HTTP_CODES.NOT_FOUND, 'Category not found');
        }

        Auditlogs.info(req.user?.email, 'Categories', 'update', {_id:body._id, ...updates});
        LoggerClass.info(req.user?.email, 'Categories', 'update', {_id:body._id, ...updates});
        
        res.json(Response.successResponse(HTTP_CODES.OK, 'Category updated successfully'));
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
        let category = await Categories.findByIdAndDelete(body._id);
        if (!category) {
            throw new CustomError(HTTP_CODES.NOT_FOUND, 'Category not found');
        }
        Auditlogs.info(req.user?.email, 'Categories', 'delete', {_id:body._id});
        res.json(Response.successResponse(HTTP_CODES.OK, 'Category deleted successfully'));
    } catch (error) {
        let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error);
        res.status(errorResponse.code).json(errorResponse);
    }
});

module.exports = router;
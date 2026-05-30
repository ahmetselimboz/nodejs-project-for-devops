const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Response = require('../lib/Response');
const { HTTP_CODES } = require('../config/Enum');
const I18n = require('../lib/i18n');
const catchAsync = require('../lib/utils/catchAsync');

const i18n = new I18n();

/**
 * Liveness Probe: Is the application process alive?
 * Kubernetes restarts the container if this endpoint doesn't respond.
 */
router.get('/live', (req, res) => {
    Response.successResponse(res, HTTP_CODES.OK, i18n.translate('HEALTH.ALIVE'));
});

/**
 * Readiness Probe: Is the application ready to accept traffic?
 * Checks both process and database connection health.
 */
router.get('/ready', catchAsync(async (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
        Response.successResponse(res, HTTP_CODES.OK, i18n.translate('HEALTH.READY'));
    } else {
        res.status(HTTP_CODES.INT_SERVER_ERROR).json(
            Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, new Error(i18n.translate('HEALTH.DB_NOT_READY')))
        );
    }
}));

module.exports = router;
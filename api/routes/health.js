const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Response = require('../lib/Response');
const { HTTP_CODES } = require('../config/Enum');

/**
 * Liveness Probe: Uygulama süreci (process) yaşıyor mu?
 * Kubernetes bu endpoint'ten yanıt alamazsa konteyneri restart eder.
 */
router.get('/live', (req, res) => {
    res.json(Response.successResponse(HTTP_CODES.OK, "I am alive!"));
});

/**
 * Readiness Probe: Uygulama trafik almaya hazır mı?
 * Sadece süreç değil, veritabanı bağlantısı da kontrol edilir.
 */
router.get('/ready', async (req, res) => {
    try {
        // MongoDB bağlantı durumunu kontrol et (1 = connected)
        const isDbConnected = mongoose.connection.readyState === 1;
        
        if (isDbConnected) {
            res.json(Response.successResponse(HTTP_CODES.OK, "System is ready for traffic."));
        } else {
            res.status(HTTP_CODES.INT_SERVER_ERROR).json(
                Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, "Database connection is not ready.")
            );
        }
    } catch (error) {
        res.status(HTTP_CODES.INT_SERVER_ERROR).json(
            Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error.message)
        );
    }
});

module.exports = router;
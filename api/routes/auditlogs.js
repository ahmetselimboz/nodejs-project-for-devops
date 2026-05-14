var express = require('express');
const AuditLogs = require('../db/models/AuditLogs');
const Response = require('../lib/Response');
const { HTTP_CODES } = require('../config/Enum');
const moment = require('moment');
var router = express.Router();

/* GET users listing. */
router.post('/', async (req, res) => {
  try {
    let body = req.body;
    let query = {};
    let skip = body.skip || 0;
    let limit = body.limit || 500;
    let sort = body.sort || { created_at: -1 };
    let select = body.select || '';
    let populate = body.populate || '';


    if (typeof body.skip !== 'number') {
      skip = 0;
    }

    if (typeof body.limit !== 'number' && body.limit > 500) {
      limit = 500;
    }

    if (typeof body.sort !== 'object') {
      sort = { created_at: -1 };
    }

    if (body.begin_date && body.end_date) {
      query.created_at = { $gte: moment(body.begin_date).toDate(), $lte: moment(body.end_date).toDate() };
    } else {
      query.created_at = { $gte: moment().subtract(1, 'day').toDate(), $lte: moment().toDate() };
    }


    let count = await AuditLogs.countDocuments(query);
    let auditLogs = await AuditLogs.find(query).skip(skip).limit(limit).sort(sort).select(select).populate(populate);
    res.json(Response.successResponse(HTTP_CODES.OK, auditLogs, count));

  } catch (error) {
    let errorResponse = Response.errorResponse(HTTP_CODES.INT_SERVER_ERROR, error);
    res.status(errorResponse.code).json(errorResponse);
  }
});

module.exports = router;

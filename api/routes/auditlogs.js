var express = require('express');
const AuditLogs = require('../db/models/AuditLogs');
const Response = require('../lib/Response');
const { HTTP_CODES } = require('../config/Enum');
const moment = require('moment');
const auth = require('../lib/auth')();
const catchAsync = require('../lib/utils/catchAsync');
const validate = require('../lib/middlewares/validate');
const { queryAuditlogsSchema } = require('../lib/schemas/AuditlogSchemas');

var router = express.Router();

router.use(auth.authenticate());

/**
 * Query audit logs with pagination, sorting, and date filtering
 */
router.post('/', auth.checkRoles('auditlogs_view'), validate(queryAuditlogsSchema), catchAsync(async (req, res) => {
  let body = req.body;
  let query = {};
  let skip = body.skip || 0;
  let limit = body.limit || 500;
  let sort = body.sort || { created_at: -1 };
  let select = body.select || '';
  let populate = body.populate || '';

  if (body.begin_date && body.end_date) {
    query.created_at = {
      $gte: moment(body.begin_date).toDate(),
      $lte: moment(body.end_date).toDate()
    };
  } else {
    query.created_at = {
      $gte: moment().subtract(1, 'day').toDate(),
      $lte: moment().toDate()
    };
  }

  let count = await AuditLogs.countDocuments(query);
  let auditLogs = await AuditLogs.find(query)
    .skip(skip)
    .limit(limit)
    .sort(sort)
    .select(select)
    .populate(populate);

  Response.successResponse(res, HTTP_CODES.OK, auditLogs, count);
}));

module.exports = router;

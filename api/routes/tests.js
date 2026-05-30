const express = require("express");
const catchAsync = require("../lib/utils/catchAsync");
const Response = require("../lib/Response");
const { HTTP_CODES } = require("../config/Enum");
const router = express.Router();


router.get("/", catchAsync((req,res)=>{
    Response.successResponse(res, HTTP_CODES.OK, "Testing...");
}))



module.exports = router;
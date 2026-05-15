const path = require('path');
const { HTTP_CODES } = require('../config/Enum');
const CustomError = require('./Error');
const LoggerClass = require('./logger/logger');
const I18n = require('./i18n');

const i18n = new I18n();

const PROJECT_ROOT = path.resolve(__dirname, '..');



class Response {
    constructor() {}

    static #getErrorLocation(error) {
        if (!error?.stack) return 'unknown';
        const lines = error.stack.split('\n');
        for (let i = 1; i < lines.length; i++) {
            const match = lines[i].match(/\(?([^()\s]+):(\d+):(\d+)\)?$/);
            if (!match) continue;
            const [, file, line] = match;
            if (file.startsWith('node:')) continue;
            const rel = file.startsWith(PROJECT_ROOT) ? path.relative(PROJECT_ROOT, file) : file;
            return `${rel}:${line}`;
        }
        return 'unknown';
    }


    static successResponse(code, data){
        return {
            code: code || HTTP_CODES.OK,
            success: true,
            data
        }
    }

    static errorResponse(code, error, lang){

        

        if(error instanceof CustomError){
            return {
                code: error.code || HTTP_CODES.INT_SERVER_ERROR,
                success: false,
                error:{
                    message: error.message,
                    description: error.description
                }
            }
        }else if(error.message?.includes('E11000')){
            return {
                code: HTTP_CODES.CONFLICT,
                success: false,
                error:{
                    message: i18n.translate('COMMON.ALREADY_EXISTS', lang),
                    description: i18n.translate('COMMON.ALREADY_EXISTS_DESCRIPTION', lang)
                }
            }
        }
        LoggerClass.error("System", this.#getErrorLocation(error), 'system_error', error.message);
        return {
            code: HTTP_CODES.INT_SERVER_ERROR,
            success: false,
            error:{
                message: i18n.translate('COMMON.INTERNAL_SERVER_ERROR', lang),
                description: error.message
            }
        }
    }
}

module.exports = Response;
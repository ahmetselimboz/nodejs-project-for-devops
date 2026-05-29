const { LOG_LEVELS } = require('../config/Enum');
const AuditLogs = require('../db/models/AuditLogs');

let instance = null;

class Auditlogs {
    constructor() {
        if (instance) {
            return instance;
        }
        instance = this;
    }

    info(email, location, proc_type, log) {
        this.#saveToDB({level: LOG_LEVELS.INFO, email, location, proc_type, log});
    }

    warn(email, location, proc_type, log) {
        this.#saveToDB({level: LOG_LEVELS.WARN, email, location, proc_type, log});
    }

    error(email, location, proc_type, log) {
        this.#saveToDB({level: LOG_LEVELS.ERROR, email, location, proc_type, log});
    }

    debug(email, location, proc_type, log) {
        this.#saveToDB({level: LOG_LEVELS.DEBUG, email, location, proc_type, log});
    }

    verbose(email, location, proc_type, log) {
        this.#saveToDB({level: LOG_LEVELS.VERBOSE, email, location, proc_type, log});
    }

    http(email, location, proc_type, log) {
        this.#saveToDB({level: LOG_LEVELS.HTTP, email, location, proc_type, log});
    }

    async #saveToDB({level, email, location, proc_type, log}) {
      await AuditLogs.create({level, email, location, proc_type, log});

    }
}

module.exports = new Auditlogs();
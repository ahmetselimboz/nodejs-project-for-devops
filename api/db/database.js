const mongoose = require('mongoose');

let instance = null;
class Database {
    constructor() {
        if (!instance) {
            this.mongoConnetion = null;
            instance = this;
        }
        return instance;
    }

    async connect(options) {
        try {
            console.log('Connecting to MongoDB...');
            let db = await mongoose.connect(options.CONNECTION_STRING);
            this.mongoConnetion = db;
            console.log('Connected to MongoDB!');
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    }
}

module.exports = Database;
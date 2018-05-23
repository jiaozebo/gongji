"use strict";
const path = require('path');
const Database = require('better-sqlite3');
let db_path = path.join(__dirname, 'gj.db');
const db = global.db = global.db || new Database(db_path, {fileMustExist:true});
module.exports = db;
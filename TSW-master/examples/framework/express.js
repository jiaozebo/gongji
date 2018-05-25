"use strict";

var express    = require('express');
var app        = express();
const logger = plug('logger');


//http://127.0.0.1/express
app.use(function(req, res, next){
	// debugger;
	logger.setKey("111");
	next();
});

//app.listen(80);



function wrapAsyn(fn) {
    return function (req, res, next) {
        // Make sure to `.catch()` any errors and pass them along to the `next()`
        // middleware in the chain, in this case the error handler.
        fn(req, res, next).catch(next);
    };
}

const db = require('./db')
app.get("/last_shidu_value/:puid", wrapAsyn(async (req, res) => {
	const puid = req.params.puid;
	var key = db.prepare('SELECT key FROM key2puid WHERE puid = ? AND key like ?').get(puid, "%%-A2");
	if (!key) throw new Error(`puid ${puid} not found`);
	
	const key_value = db.prepare('SELECT value FROM key2value WHERE key = ? ORDER BY `tm` DESC LIMIT 1 ').get(key.key);
	if (!key_value) throw new Error("value of " + key.key + " not found.");
	res.json({key:key.key, value:key_value.value, puid:puid});
}));

app.get("/last_wendu_value/:puid", wrapAsyn(async (req, res) => {
	const puid = req.params.puid;
	var key = db.prepare('SELECT key FROM key2puid WHERE puid = ? AND key like ?').get(puid, "%%-A1");
	if (!key) throw new Error(`puid ${puid} not found`);
	
	const key_value = db.prepare('SELECT value FROM key2value WHERE key = ? ORDER BY `tm` DESC LIMIT 1 ').get(key.key);
	if (!key_value) throw new Error("value of " + key.key + " not found.");
	res.json({key:key.key, value:key_value.value, puid:puid});
}));


app.use(function (err, req, res, next) {
	logger.error(`${req.method} ${req.path} error:${err.message} stack:${err.stack}`)
	res.status(500).send('Internal Server Error:' + err.message);
});
//划重点
module.exports = app;

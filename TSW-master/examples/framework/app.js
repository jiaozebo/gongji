"use strict";
const GJManager = require('./gongji').GJManager;
const GJHeader = require('./gongji').GJHeader;
const GJ = require('./gongji').GJ;
const fs = require('fs');
const path = require('path');
const express = require('express');
// var Iconv = require('iconv').Iconv;
// const Buffer = require('buffer');
const util = require("util")
const moment = require('moment');
const clients = require('./websocket_clients');
const db = require('./db')
var root = path.join(__dirname, 'public', 'log');
console.log("path root : " + root);
if (!fs.existsSync(root)) {
    fs.mkdir(root, function () { });
}
let logger = null;
if (process.env.NODE_ENV == 'development'){ logger = plug('logger');}else{ logger = plug('logger');}
// logger.setKey("app");
/**
 *  报警下限	恢复下限	恢复上限	报警上限    是否已报警.
 */
const alert_table = {
"S0-E1-A1":[18,19,27,28,0],
"S0-E1-A2":[35,36,74,75,0],
"S0-E2-A1":[18,19,27,28,0],
"S0-E2-A2":[35,36,74,75,0],
"S0-E3-A1":[18,19,27,28,0],
"S0-E3-A2":[35,36,74,75,0],
"S0-E4-A1":[18,19,27,28,0],
"S0-E4-A2":[35,36,74,75,0],
"S0-E5-A1":[18,19,27,28,0],
// "S0-E5-A1":[28,29,17,18,0],
"S0-E5-A2":[35,36,74,75,0],
"S0-E6-A1":[18,19,27,28,0],
"S0-E6-A2":[35,36,74,75,0],
"S0-E7-A1":[18,19,27,28,0],
"S0-E7-A2":[35,36,74,75,0],
// "S0-E7-A2":[35,36,74,75,1],
"S0-E8-A1":[18,19,27,28,0],
"S0-E8-A2":[35,36,74,75,0],
"S0-E9-A1":[18,19,27,28,0],
"S0-E9-A2":[35,36,74,75,0],
"S0-E10-A1":[18,19,27,28,0],
"S0-E10-A2":[35,36,74,75,0],
"S0-E11-A1":[18,19,27,28,0],
"S0-E11-A2":[35,36,74,75,0],
"S0-E12-A1":[18,19,27,28,0],
"S0-E12-A2":[35,36,74,75,0],
"S0-E13-A1":[18,19,27,28,0],
"S0-E13-A2":[35,36,74,75,0],
"S0-E14-A1":[18,19,27,28,0],
"S0-E14-A2":[35,36,74,75,0]
};


//const testB = Buffer.from([0xFF,0xFF,0xFF,0xFF,0x01,0x00,0x00,0x01,0xFF,0xFF,0xFF,0xFF,0x54,0x00,0x00,0x00,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0x52,0x00,0x53,0x30,0x2D,0x45,0x31,0x31,0x2D,0x45,0x56,0x7C,0x7C,0xB1,0xA3,0xB4,0xE6,0xC4,0xA3,0xBF,0xE9,0x36,0x32,0x30,0x35,0x7C,0x31,0x23,0x41,0x4C,0x5F,0xD0,0xE9,0xC4,0xE2,0xC9,0xE8,0xB1,0xB8,0x7C,0x53,0x65,0x74,0x50,0x61,0x72,0x61,0x6D,0x20,0x64,0x65,0x6D,0x6F,0x20,0x65,0x76,0x65,0x6E,0x74,0x7C,0x33,0x7C,0x37,0x7C,0x32,0x30,0x30,0x39,0x2D,0x31,0x32,0x2D,0x30,0x32,0x20,0x30,0x39,0x3A,0x35,0x35,0x3A,0x31,0x32,0x7C]);
//let gj = new GJ(testB);

const IP = "192.168.111.200";
const PORT = 7000;
const gjManager = new GJManager(IP, PORT);


/*
(async ()=>{

    var stmt = db.prepare('INSERT into key2puid VALUES(?,?)');

    const p = path.join(__dirname, 'key2puid.json');
    let str = await util.promisify(fs.readFile)(p,{});
    let json = JSON.parse(str);
    for(var k in json){
        stmt.run(k, json[k]);
    }
})();
*/



const stmt = db.prepare('SELECT * FROM key2puid');
const rows = stmt.all();

gjManager.on('data', async (data)=>{
    
    var stmtInsert = db.prepare('INSERT INTO key2value VALUES(?,?,?)');
    let units = data.body.units;
    // 过滤.
    for (let unit of units){
        if (unit.key.endsWith('-VA')){
            let key = unit.key.substring(0, unit.key.lastIndexOf('-VA'));
            if (alert_table[key]){  // 有价值的,插入数据库.
                let time = moment().format("YYYY-MM-DD HH:MM:SS");
                stmtInsert.run(key, unit.value, time);
                logger.debug(`recv valuable data.KEY: ${key} VALUE: ${unit.value}`);

                let puid = null
                // emit 
                for(let k2p of rows){
                    if (k2p.key == key){
                        puid = puid || k2p.puid;
                        gjManager.emit("data_change", {key:key, value:unit.value, puid:k2p.puid});
                    }
                }

                //*  报警下限	恢复下限	恢复上限	报警上限    是否已报警.
            const realValue = parseFloat(unit.value);
            const isWendu = key.endsWith("-A1");
            const alert_item = alert_table[key];            
            if (alert_item){

                if (realValue >= alert_item[3]){    // 上限报警!
                    alert_item[4] = 2;
                    gjManager.emit("alert", {type:"超出预警值报警", key:key, key_type:isWendu?1:2, value:realValue, alertValue:alert_item[3], recoverValue:alert_item[2], puid:puid});
                    logger.warn(`${key}上限报警!!!.值:${realValue},报警值:${alert_item[3]},恢复值:${alert_item[2]},PUID:${puid}`);
                } else if (realValue <= alert_item[0]){ // 下限报警!
                    alert_item[4] = 1;
                    gjManager.emit("alert", {type:"低于预警值报警", key:key, key_type:isWendu?1:2, value:realValue, alertValue:alert_item[0], recoverValue:alert_item[1], puid:puid});
                    logger.warn(`${key}下限报警.值:${realValue},报警值:${alert_item[0]},恢复值:${alert_item[1]},PUID:${puid}`);
                }
                else if (alert_item[4] == 1){   // 看看下限报警是否恢复?
                    if (realValue >= alert_item[1]){    // 已恢复
                        logger.warn(`${key}下限报警已恢复.值:${realValue},报警值:${alert_item[0]},恢复值:${alert_item[1]},PUID:${puid}`);
                        alert_item[4] = 0;
                    }else{
                        gjManager.emit("alert", {type:"低于预警值报警未恢复", key:key,key_type:isWendu?1:2, value:realValue, alertValue:alert_item[0], recoverValue:alert_item[1], puid:puid});
                        logger.warn(`${key}下限报警未恢复.值:${realValue},报警值:${alert_item[0]},恢复值:${alert_item[1]},PUID:${puid}`);
                    }
                }else if (alert_item[4] == 2){
                    if (realValue <= alert_item[2]){    // 已恢复
                        logger.warn(`${key}上限报警已恢复.值:${realValue},报警值:${alert_item[3]},恢复值:${alert_item[2]},PUID:${puid}`);
                        alert_item[4] = 0;
                    }else{
                        gjManager.emit("alert", {type:"超出预警值报警未恢复", key:key, key_type:isWendu?1:2, value:realValue, alertValue:alert_item[3], recoverValue:alert_item[2], puid:puid});
                        logger.warn(`${key}上限报警未恢复!!!.值:${realValue},报警值:${alert_item[3]},恢复值:${alert_item[2]},PUID:${puid}`);
                    }
                }
            }
            }
        }
    }

});


// test
// if (false)
setTimeout(async () => {
    let buffer = Buffer.alloc(0);
    const arr = ['315','347','362','378','386','390','394','405','425','315','347','362','378','386','390','394','405','425','315','347','362','378','386','390','394','405','425'];
    for (var k of arr){
        const p = path.join(__dirname, k + ".hex");
        let data = await util.promisify(fs.readFile)(p,{});
        if (buffer.length != 0){
            logger.warn("拼包");
            data = Buffer.concat([buffer, data]);
            buffer = Buffer.alloc(0);
        }
        let header = new GJHeader(data);
        if (data.length >= header.bodyLen + 32){
            // 收到了完整的一包.
            logger.info(`收到了完整的一包,数据长度:${data.length}, 包体长度:${header.bodyLen}`);
            if (data.length > header.bodyLen + 32){ // 收到的包里面,含有下一个数据包.
                logger.warn(`收到的数据含有多个数据包.需要进行分包处理.`);
            }
            let buffer1 = data.slice(0, 32+header.bodyLen);
            const gj = new GJ(buffer1);
            

            await util.promisify(fs.writeFile)(path.join(__dirname, 'public', moment().format('x') + ".json"),JSON.stringify(gj.body), {});

            gjManager.emit("data", gj);

            buffer = data.slice(32+ header.bodyLen);
        }else{
            logger.info(`收到了一个数据体,但是未包含一个完整数据包.`)
            buffer = data;
        }
    }       
}, 3000);


gjManager.on('data_change', async (value)=>{
    logger.info(`on data_change value:${JSON.stringify(value)}`)
	clients.forEach(async (ws)=>{
		ws.send(JSON.stringify(value));
	});
});


gjManager.on('alert', async (value)=>{
    value.alert = 1;
	clients.forEach(async (ws)=>{
		ws.send(JSON.stringify(value));
    });
    
    // sms alert...
    // const stmt = db.prepare("SELECT phoneNumber FROM phoneNumber WHERE `enable` = 1");
    // stmt.all().forEach(async(item)=>{
    //     const phoneNumber = item.phoneNumber;
    //     // alert...
    //     logger.warn(`send alert SMS ${JSON.stringify(value)} TO USER:${phoneNumber}`);
    // })
    
});


module.exports = gjManager;
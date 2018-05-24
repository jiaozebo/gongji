const net = require('net');
// var Iconv = require('iconv').Iconv;
// const Buffer = require('buffer');
const util = require("util")
const iconv = require('iconv-lite');
 
const path = require('path');
var root = path.join(__dirname, 'public', 'log');
console.log("path root : " + root);
const fs = require('fs');
if (!fs.existsSync(root)) {
    fs.mkdir(root, function () { });
}
if (process.env.NODE_ENV == 'development'){var logger = plug('logger');}else{var logger = plug('logger');}
// logger.setKey("gj");
const EventEmitter = require('events');


class GJHeader{
    /**
     * 
     * @param 
{包头标记（BYTE）	固定格式  0xFF 0xFF 0xFF 0xFF 
协议版本（BYTE）	当前版本  0x01 0x00 0x00 0x01   （即1.0.0.1）
命令类型（int）	V2.0之前未启用该字段(0xFF 0xFF 0xFF 0xFF), V2.0开始启用了这个字段。
包体长度（DWORD）	包体中所有字节数之和
保留	该字段留待以后扩展使用
组长度（short）	代表每一组中实际内容的字节数，即内容的长度
内容（CString）	格式：key|value，其中key为对象标识，代表每个站点/设备/测点的唯一标识，value代表该点的值。如S0-E2-A1-NA|模拟量采集点演示。
} buffer 
     */
    constructor(buffer){
        this.offset = 0;
        this.baotou = this.readInt32LE(buffer);
        this.version = this.readInt32LE(buffer);
        this.cmd = this.readInt32LE(buffer);
        this.bodyLen = this.readInt32LE(buffer);
    }
    readInt32LE(buffer){
        let x = buffer.readInt32LE(this.offset);
        this.offset += 4;
        return x;        
    }
}

class GJUnit{
    // 站点名称|事件来源|事件内容|事件级别|事件类型|发生时间|事件ID（即event_guid）|
    constructor(content){
        const firstDivider = content.indexOf("|");

        this.key = iconv.decode(content.slice(0, firstDivider), 'gbk');
        this.value = iconv.decode(content.slice(firstDivider + 1), 'gbk');

        if (this.value.indexOf("报警") != -1){
            logger.warn(`有报警可能....${this.key}:${this.value}`);
        }
        // this.key = content.toString("gbk", 0, firstDivider);
        // this.value = content.toString("gbk", firstDivider + 1);
        

        // this.key = content.substring(0, firstDivider);        
        // const arr = content.split("|");
        // this.站点名称 = arr[0]
        // this.事件来源 = arr[1]
        // this.事件内容 = arr[2]
        // this.事件级别 = arr[3]
        // this.事件类型 = arr[4]
        // this.发生时间 = arr[5]
        // this.事件ID = arr[6]
    }
}

class GJBody{
    constructor(buffer){
        this.units = [];
        // let iconv = new Iconv('GB2312', 'UTF-8');
        // buffer = iconv.convert(buffer);
        while(buffer.length != 0){
            let unitLen = buffer.readInt16LE(0); 
            // let unitStr = buffer.toString('utf8', 2, unitLen + 2);
            // let unit = new GJUnit(unitStr);
            let unitBuf = buffer.slice(2, 2+ unitLen);
            let unit = new GJUnit(unitBuf);
            
            this.units.push(unit);
            buffer = buffer.slice(2+unitLen);
        }
    }
}

class GJ{
    constructor(buffer){
        this.header = new GJHeader(buffer);
        buffer = buffer.slice(32);
        this.body = new GJBody(buffer);
    }
}

class GJManager extends EventEmitter{
    constructor(ip, port){
        super()
        this.ip = ip;
        this.port = port;

        // const gj = new GJ(Buffer.alloc(512));
        const that = this;
        const client = net.createConnection({ port: this.port, host:this.ip }, async () => {
            logger.info("connect to server:%j",{ port: that.port, host:that.ip });
            
            let flag = 0x00;

            let buf = Buffer.from([
                0xFF,0xff,0xff,0xff,
                0x02,0x00,0x00,0x01,
                flag,0xff,0xff,0xff, 		// 命令类型  
                0x00,0x00,0x00,0x00, 		// 包体长度                
                0xFF,0xff,0xff,0xff,
                0xFF,0xff,0xff,0xff,
                0xFF,0xff,0xff,0xff,
                0xFF,0xff,0xff,0xff,
            ]);
            

        });

        let buffer = Buffer.alloc(0);
        client.on("data", async (data)=>{
            if (buffer.length != 0){
                // logger.warn("拼包");
                data = Buffer.concat([buffer, data]);
                buffer = Buffer.alloc(0);
            }
            let header = new GJHeader(data);
            if (data.length >= header.bodyLen + 32){
                // 收到了完整的一包.
                // logger.info(`收到了完整的一包,数据长度:${data.length}, 包体长度:${header.bodyLen}`);
                if (data.length > header.bodyLen + 32){ // 收到的包里面,含有下一个数据包.
                    // logger.warn(`收到的数据含有多个数据包.需要进行分包处理.`);
                }
                let buffer1 = data.slice(0, 32+header.bodyLen);
                const gj = new GJ(buffer1);
                that.emit("data", gj);

                buffer = data.slice(32+ header.bodyLen);
            }else{
                // logger.info(`收到了一个数据体,但是未包含一个完整数据包.`)
                buffer = data;
            }
        });

        this.client = client;
    }
}

module.exports = {GJManager:GJManager, GJ:GJ,GJHeader:GJHeader}
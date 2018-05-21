const net = require('net');
var Iconv = require('iconv').Iconv;
// const Buffer = require('buffer');



var path = require('path');
var root = path.join(__dirname, '..','public', 'log');
console.log("path root : " + root);
const fs = require('fs');
if (!fs.existsSync(root)) {
    fs.mkdir(root, function () { });
}
if (process.env.NODE_ENV == 'development'){var logger = require('tracer').colorConsole();}else{var logger = require('tracer').dailyfile({root: root, maxLogFiles: 10});}

const IP = "127.0.0.1";
const PORT = 7000;


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
        this.buffer = buffer;
        this.offset = 0;
        this.baotou = this.readInt32LE();
        this.version = this.readInt32LE();
        this.cmd = this.readInt32LE();
        this.bodyLen = this.readInt32LE();
    }
    readInt32LE(){
        let x = this.buffer.readInt32LE(this.offset);
        this.offset += 4;
        return x;        
    }
}

class GJUnit{
    // 站点名称|事件来源|事件内容|事件级别|事件类型|发生时间|事件ID（即event_guid）|
    constructor(content){
        this.key = content.substring(0, content.indexOf("|"))
        content = content.substring(content.indexOf("||") + 2);
        const arr = content.split("|");
        this.站点名称 = arr[0]
        this.事件来源 = arr[1]
        this.事件内容 = arr[2]
        this.事件级别 = arr[3]
        this.事件类型 = arr[4]
        this.发生时间 = arr[5]
        this.事件ID = arr[6]
    }
}

class GJBody{
    constructor(buffer){
        this.bodies = [];
        let offset = 0;
        let iconv = new Iconv('GB2312', 'UTF-8');
        buffer = iconv.convert(buffer);
        while(buffer.length != 0){
            let unitLen = buffer.readInt16LE(offset); offset += 2;
            let unitStr = buffer.toString('utf8', offset, unitLen);
            let unit = new GJUnit(unitStr);
            logger.info(unit);
            this.bodies.push(unit);
            buffer = buffer.slice(2+unitLen);
            offset += unitLen;
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

const client = net.createConnection({ port: PORT, host:IP }, async () => {
    logger.info("connect to server:%j", client);

});

client.on("data", async (data)=>{
    let gj = new GJ(data);
});

module.exports = {
    GJ:GJ,
}
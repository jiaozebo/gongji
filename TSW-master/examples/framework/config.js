

//http监听地址
this.httpAddress = '0.0.0.0';

//http监听地址
this.httpPort = 3000;

//路由
this.router = require('./router.js');

//logger
this.logger = {
    logLevel: 'debug'
};

this.wsRouter = require('./wsRouter.js')

this.alphaFile = `${__dirname}/alpha.txt`;

this.appid  = 'tsw365';
this.appkey  = 'fBMs4HK5kjR4DPEQHSAZKBYY';

//https://tsw365.tswjs.org/log/view/xxx

this.afterStartup = ()=>{
    this.gjManager = require('./app');
}
"use strict";

const clients = require('./websocket_clients');
this.onConnection = function(ws){
	//WebSocket连接建立的回调函数
	// ws.send('hello~');

	clients.add(ws);
};

this.onMessage = function(ws, message) {
	//收到消息的回调函数
	ws.send('hello~');
};

this.onClose = function(ws, code, reason) {
	//WebSocket连接关闭时的处理函数
	clients.delete(ws);
};

this.onError = function(ws, err) {
	//WebSocket连接出错时的处理函数
	clients.delete(ws);
};

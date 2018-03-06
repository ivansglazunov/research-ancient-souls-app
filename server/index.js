const fs = require('fs');
const _ = require('lodash');
const http = require('http');
const IO = require('socket.io');
const express = require('express');
const session = require('express-session');

const { Peer } = require('ancient-peer/lib/peer');

// server

const expressServer = express();
expressServer.use(session({
	secret: 'ancient-souls',
	resave: true,
	saveUninitialized: false,
	cookie: {},
}));
const httpServer = http.createServer(expressServer);
const socketServer = IO(httpServer);

httpServer.listen(process.env.PORT);

// routes

const html = fs.readFileSync('./client/index.html', 'utf-8');

expressServer.get('/', function (req, res) {
	res.send(html);
});

expressServer.use(express.static('./client/lib'));

// peer

const cursors = [];

class AppPeer extends Peer {
	getApiCallbacks(apiQuery, callback) {
		callback({
			gotQuery: (channelId, { cursorId, query, queryId }) => {
				this.sendBundles(channelId, {
					type: 'set',
					path: '',
					value: { counter: serverCounter },
					cursorId: cursorId,
				});
				
				cursors.push({ channelId, cursorId });
			},
			cursorDestroyed: (channelId, cursorId) => {},
			channelDestroyed: (channelId) => {},
		});
	}
}

let serverCounter = 0;
setInterval(() => {
	_.each(cursors, ({ cursorId, channelId }) => {
		peer.sendBundles(channelId, {
			cursorId: cursorId,
			type: 'set',
			path: 'counter',
			value: serverCounter
		});
	});

	serverCounter = serverCounter > 900719925474099?0 : serverCounter+1;
}, 50);

const peer = new AppPeer();

// transports

function createSocketTransport() {
	socketServer.on('connect', (socket) => {
		const channel = peer.channelsManager.create();
		
		channel.on('send', ({ msg }) => socket.emit('ancient-channels', msg));
		
		socket.on('ancient-channels', (data) => channel.got(data));
		socket.on('connect', () => channel.connect());
		socket.on('disconnect', () => channel.disconnected());
	});
}

function createAjaxTransport() {
	const pkgsStack = {};

	function createChannel() {
		const channel = peer.channelsManager.create();
		channel.on('emit', console.log);

		channel.on('send', ({ pkg }) => {
			if (!pkgsStack[channel.id]) pkgsStack[channel.id] = []
			pkgsStack[channel.id].push(pkg);
		});

		return channel;
	}

	expressServer.get('/ancient-channels', function ({ session, query }, res) {
		const channel = peer.channelsManager.nodes[session.channelId] || createChannel();
		session.channelId = channel.id;
		const {pkgs} = JSON.parse(query.json);
		if (pkgs) _.each(pkgs, pkg => channel.gotPkg(pkg));
		res.send({ pkgs: pkgsStack[channel.id] });
		pkgsStack[channel.id] = [];
	});
}

createSocketTransport();
createAjaxTransport();
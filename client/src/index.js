const $ = require('jquery');
const io = require('socket.io-client');

const { Peer } = require('ancient-peer/lib/peer');

// client

const socket = io();

// peer

const peer = new Peer();

// transports

function createSocketChannel() {
	const channel = peer.channelsManager.create();

	channel.on('connected', () => {
		const cursor = peer.exec(channel.id, null, null);
		cursor.on('changed', ({ watch }) => {
			watch('counter', ({ newValue }) => {
				document.getElementById("socket-io-counter").innerHTML = newValue;
			});
		});
	});

	channel.on('send', ({ msg }) => socket.emit('ancient-channels', msg));

	socket.on('ancient-channels', (data) => channel.got(data));
	socket.on('connect', () => channel.connect());
	socket.on('disconnect', () => channel.disconnected());

	return channel;
};

window.$ = $;
window.peer = peer;

function createAjaxChannel() {
	const channel = peer.channelsManager.create();

	function send(pkgs) {
		$.get('ancient-channels', { json: JSON.stringify({ pkgs }) })
		.done(({pkgs}) => !pkgs || _.each(pkgs, pkg => channel.gotPkg(pkg)));
	}

	channel.on('connected', () => {
		channel.connect();
	});

	channel.on('send', ({ pkg }) => {
		send([pkg]);
	});

	channel.connect();

	const cursor = peer.exec(channel.id, null, null);
	
	cursor.on('changed', ({ watch }) => {
		watch('counter', ({ newValue }) => {
			document.getElementById("ajax-counter").innerHTML = newValue;
		});
	});

	setInterval(() => send([]), 50);
};

createSocketChannel();
createAjaxChannel();
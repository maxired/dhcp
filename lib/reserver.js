var noodle = require('noodlesware'),
	EventEmitter = require("events").EventEmitter,
	_ = require('underscore'),
	dgram = require("dgram"),
	path = require('path'),
	inherits = require("util").inherits,
	fs = require('fs'),

	util = require('./util'),
	serializeResponse = require('./middleware/serializeResponse');


function DHCP() {
	if (!(this instanceof DHCP)) return new DHCP();

	var toReturn = new noodle(function() {});
	_.extend(this, toReturn)

	this.use("discover request", noodle.PRIORITY.LATEST, serializeResponse);


	/*
	var handleMessage = function() {
		toReturn.emit.apply(toReturn, ['message'].concat(Array.prototype.slice.call(arguments, 0)));
	}*/

	this.handle = {};
	for (var fn in DHCP.handle)
		this.handle[fn] = DHCP.handle[fn].bind(this);
	for (var fn in DHCP.on) {
		this.on[fn] = DHCP.on[fn].bind(this);
		this.on(fn, this.on[fn]);
	};


	// load options
	this.options = require('./options').options;

	// load parsers
	this.parsers = require('./parsers').parsers;

	_.extend(this, {
		/*set: function() {},
		enable: function() {},
		disable: function() {},*/
		listen: function(address, port) {

			var socket = this.socket = dgram.createSocket("udp4");
			socket.bind(port || 67, address || '0.0.0.0', function() {
				socket.setBroadcast(true);
				this.emit("listening");
			});

			socket.on("message", this.handle.message);

			socket.on("error", function(err) {
				console.log("there was a error", err);
			});
		}
	});

	return this;
};

/*
 * DHCP Message Types.
 */
DHCP.messageTypes = require("./message-types");

/*
 * Adding options.
 */
DHCP.prototype.addOptions = function(options) {
	for (var code in options)
		this.addOption(code, options[code]);
};
DHCP.prototype.addOption = function(code, option) {
	this.options[code] = option;
};

/*
 * Adding parsers.
 */
DHCP.prototype.addParsers = function(parsers) {
	if (parsers instanceof Array)
		parsers.forEach(this.addParser, this);
	else
		for (var name in parsers)
			this.addParser(name, parsers[name]);
};
DHCP.prototype.addParser = function(name, parser) {
	if (typeof name == "object")
		this.parsers[name.name] = name;
	else
		this.parsers[name] = parser;
};


DHCP.handle = {
	messageOptionsBlock: function(msg) {
		var pos = 0,
			ended = false,
			type, length, options = {};

		while (!ended && pos < msg.length) {
			type = msg[pos++];

			switch (type) {
				case 0x00:
					pos++;
					break;
				case 0xFF:
					ended = true;
					break;
				default:
					length = msg.readUInt8(pos++);
					options[type] = this.handle.messageOption(type, msg.slice(pos, pos + length));
					pos += length;
			}
		}

		return options;
	},
	messageOption: function(type, buf) {
		if (type in this.options) {
			var parser = this.parsers[this.options[type].type];

			if (!this.options[type].list) {
				return parser.read(buf);
			} else {
				var list = [],
					pos = 0;

				while (pos < buf.length)
					list.push(parser.read(buf.slice(pos, pos += parser.length)));

				return list;
			}
		} else {
			return buf.toString("hex");
		}
	},
	message: function(msg, rinfo) {
		msg.rinfo = rinfo;

		msg.op = msg[0]
		msg.htype = msg[1];
		msg.hlen = msg[2];
		msg.hops = msg[3];
		msg.xid = msg.readUInt32BE(4);
		msg.secs = msg.readUInt16BE(8);
		msg.flags = msg.readUInt16BE(10);
		msg.ciaddr = util.bufToIp(msg, 12);
		msg.yiaddr = util.bufToIp(msg, 16);
		msg.siaddr = util.bufToIp(msg, 20);
		msg.giaddr = util.bufToIp(msg, 24);
		msg.chaddr = util.bufToMac(msg, 28);
		msg.sname = msg.toString("utf-8", 44, 108);
		msg.file = msg.toString("utf-8", 108, 236);
		msg.magicCookie = msg.readUInt32BE(236);
		msg.options = this.handle.messageOptionsBlock(msg.slice(240, msg.length));
		//msg.respond = this._respond.bind(this, msg);
		console.log("will emit message")
		this.emit("message", msg, {});
	}
};


DHCP.on = {
	message: function(msg) {
		if (!(0x35 in msg.options)) return this.emit("error", new Error("No DHCP Message Type"), msg);

		switch (+msg.options[0x35]) {
			case DHCP.messageTypes.DHCPDISCOVER:
				{
					console.log("emit discover")
					this.emit("discover", msg, {});
					break;
				}
			case DHCP.messageTypes.DHCPREQUEST:
				{
					this.emit("request", msg, {});
					break;
				}
			case DHCP.messageTypes.DHCPDECLINE:
				this.emit("nak", msg, {});
				break;
			case DHCP.messageTypes.DHCPRELEASE:
				this.emit("release", msg, {});
				break;
			case DHCP.messageTypes.DHCPINFORM:
				this.emit("inform", msg, {});
				break;
			default:
				return this.emit("error", new Error("Invalid DHCP Message Type"), msg);
		}
	}
};

module.exports = DHCP;

/*
 * Event Handlers.
 */
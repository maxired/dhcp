var dgram = require("dgram")
, EventEmitter = require("events").EventEmitter
, fs = require("fs")
, path = require("path")
, inherits = require("util").inherits
, util = require("./util");

module.exports = DHCP;

inherits(DHCP, EventEmitter);
function DHCP( config ,  onListening) {
	if(!(this instanceof DHCP)) return new DHCP(address);
	EventEmitter.call(this);

 this.config = config;
	this.address = (config && config.address) || "0.0.0.0";
	if(onListening) this.on("listening", onListening);
	// bind event listeners
	this.handle = {};
	for(var fn in DHCP.handle)
		this.handle[fn] = DHCP.handle[fn].bind(this);
	for(var fn in DHCP.on) {
		this.on[fn] = DHCP.on[fn].bind(this);
		this.on(fn, this.on[fn]);
	}

	// load options
	this.options = {};
	var optionsPath = path.join(path.dirname(module.filename), "options");
	var jsRegexp = /\.js$/;
	fs.readdirSync(optionsPath)
		.filter(function(file){return jsRegexp.test(file)})
		.forEach(function(file) {
				this.addOptions(require(path.join(optionsPath, file)));
				}, this);

	// load parsers
	this.parsers = {};
	var parsersPath = path.join(path.dirname(module.filename), "parsers");
	fs.readdirSync(parsersPath)
		.filter(function(file){return jsRegexp.test(file)})
		.forEach(function(file){
			this.addParsers(require(path.join(parsersPath, file)));
			}, this);

	// start server
	this.inbound = dgram.createSocket("udp4");
	this.inbound.bind(67, this.address,  function(){
			this.inbound.setBroadcast(true);
			this.emit("listening");
			}.bind(this));
	this.inbound.on("message", this.handle.message);
	this.outbound = dgram.createSocket("udp4");
	this.inbound.on("error", function(err){
			console.log("there was a error", err);
			});
}

/*
 * DHCP Message Types.
 */
DHCP.messageTypes = require("./message-types");

/*
 * Adding options.
 */
DHCP.prototype.addOptions = function(options) {
	for(var code in options)
		this.addOption(code, options[code]);
};
DHCP.prototype.addOption = function(code, option) {
	this.options[code] = option;
};

/*
 * Adding parsers.
 */
DHCP.prototype.addParsers = function(parsers) {
	if(parsers instanceof Array)
		parsers.forEach(this.addParser, this);
	else
		for(var name in parsers)
			this.addParser(name, parsers[name]);
};
DHCP.prototype.addParser = function(name, parser) {
	if(typeof name == "object")
		this.parsers[name.name] = name;
	else
		this.parsers[name] = parser;
};

/*
 * Event Handlers.
 */
DHCP.handle = {
messageOptionsBlock: function(msg) {
			     var pos = 0
				     , ended = false
				     , type
				     , length
				     , options = {};

			     while(!ended && pos < msg.length) {
				     type = msg[pos++];

				     switch(type) {
					     case 0x00: pos++; break;
					     case 0xFF: ended = true; break;
					     default:
							length = msg.readUInt8(pos++);
							options[type] = this.handle.messageOption(type, msg.slice(pos, pos + length));
							pos += length;
				     }
			     }

			     return options;
		     }
		     , messageOption: function(type, buf) {
			     if(type in this.options) {
				     var parser = this.parsers[this.options[type].type];

				     if(!this.options[type].list) {
					     return parser.read(buf);
				     } else {
					     var list = []
						     , pos = 0;

					     while(pos < buf.length)
						     list.push(parser.read(buf.slice(pos, pos += parser.length)));

					     return list;
				     }
			     } else {
				     return buf.toString("hex");
			     }
		     }
		     , message: function(msg, rinfo) {
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
			     msg.respond = this._respond.bind(this, msg);
			     this.emit("message", msg);

		     }
};

DHCP.on = {
message: function(msg) {
		 if(!(0x35 in msg.options)) return this.emit("error", new Error("No DHCP Message Type"), msg);

		 switch(msg.options[0x35]) {
			 case DHCP.messageTypes.DHCPDISCOVER: { this.emit("discover", msg); break; }
			 case DHCP.messageTypes.DHCPREQUEST:{ this.emit("request", msg); break; }
			 case DHCP.messageTypes.DHCPDECLINE: this.emit("nak", msg); break;
			 case DHCP.messageTypes.DHCPRELEASE: this.emit("release", msg); break;
			 case DHCP.messageTypes.DHCPINFORM: this.emit("inform", msg); break;
			 default: return this.emit("error", new Error("Invalid DHCP Message Type"), msg);
		 }
	 }
};

/*
 * msg.respond Prototype.
 */
DHCP.prototype._respond = function(msg, fields, options) {
	var _header = new Buffer(240);

	var empty32Buffer = new Buffer(4);
	empty32Buffer.fill(0x00,0,4);

	_header[0] = fields.op || 0x1;
	_header[1] = fields.htype || msg[1];
	_header[2] = fields.hlen || msg[2];
	_header[3] = fields.hops || 0x0;
	_header.writeUInt32BE(fields.xid || msg.xid, 4, true);
	_header.writeUInt16BE(fields.secs || 0x0000, 8, true);
	_header.writeUInt16BE(fields.flags || 0x0000, 10, true);

	(util.ipToBuf(fields.ciaddr) || empty32Buffer).copy(_header , 12);
	(util.ipToBuf(fields.yiaddr) || empty32Buffer).copy(_header , 16);
	(util.ipToBuf(fields.siaddr) || empty32Buffer).copy(_header , 20);
	(util.ipToBuf(fields.giaddr) || empty32Buffer).copy(_header , 24);
	( util.macToBuf( fields.chaddr || msg.chaddr)).copy(_header , 28, 0,6);
	_header.fill( 0x00 , 34, 44);	

	_header.write(fields.sname || msg.sname, 44, 108, "utf-8");
	_header.write(fields.file || msg.file, 108, 236, "utf-8");
	_header.writeUInt32BE(fields.magicCookie || msg.magicCookie || 0x63825363, 236, true);

	var _options = []
		, temp;

	for(var code in options) {
		if(options[code] instanceof Array)
			temp = Buffer.concat(options[code].map(this.parsers[this.options[code].type].write, this));
		else
			temp = this.parsers[this.options[code].type].write(options[code]);
		_options.push(new Buffer([code, temp.length]));
		_options.push(temp);
	}

	var buf = Buffer.concat([_header].concat(_options));
	this.inbound.send(buf, 0, buf.length, 68, (this.config && this.config.broadcast) || '255.255.255.255' );
	return buf;
};

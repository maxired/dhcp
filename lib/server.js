var dgram = require("dgram")
  , EventEmitter = require("events").EventEmitter
  , fs = require("fs")
  , path = require("path")
  , inherits = require("util").inherits
  , util = require("./util");

module.exports = DHCP;

inherits(DHCP, EventEmitter);
function DHCP(address, onListening) {
  if(!(this instanceof DHCP)) return new DHCP(address);
  EventEmitter.call(this);

  this.address = address || "0.0.0.0";

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
  fs.readdirSync(optionsPath).forEach(function(file) {
    this.addOptions(require(path.join(optionsPath, file)));
  }, this);

  // load parsers
  this.parsers = {};
  var parsersPath = path.join(path.dirname(module.filename), "parsers");
  fs.readdirSync(parsersPath).forEach(function(file) {
    this.addParsers(require(path.join(parsersPath, file)));
  }, this);
console.log(this.parsers);

  // start server
  this.socket = dgram.createSocket("udp4");
  this.on("listening", onListening);
this.socket.bind(67, this.address, function(){
	this.socket.setBroadcast(true);  
 	 this.emit( "listening")
  }.bind(this));
  this.socket.on("message", this.handle.message);
  this.socket.on("error", function(err){
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
			this.addOption(name, parsers[name]);
};
DHCP.prototype.addParser = function(name, parser) {
	if(typeof name == "function")
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
					     return parser(buf);
				     } else {
					     var list = []
						     , pos = 0;
					     while(pos < buf.length) {
						     list.push(parser(buf.slice(pos, parser.length)));
						     pos += parser.length;
					     }
					     return list.join("");
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
			     msg.sname = msg.toString("ascii", 44, 108);
			     msg.file = msg.toString("ascii", 108, 236);
			     msg.magicCookie = msg.slice(236, 240);
			     msg.options = this.handle.messageOptionsBlock(msg.slice(240, msg.length));
			     msg.respond = this._respond.bind(this, msg);
			     this.emit("message", msg);

		     }
};

DHCP.on = {
message: function(msg) {
		 if(!(0x35 in msg.options)) return this.emit("error", new Error("No DHCP Message Type"), msg);

		 switch(msg.options[0x35]) {
			 case DHCP.messageTypes.DHCPDISCOVER: { console.log("idhcpdiscover "); this.emit("discover", msg); break; }
			 case DHCP.messageTypes.DHCPREQUEST:{ console.log("dhcop request"); this.emit("request", msg); break; }
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
DHCP.prototype._respond = function(msg, header, options) {
	var response = new Buffer(240);

	response[0] = header.op || 0x1;
	response[1] = header.htype || msg[1];
	response[2] = header.hlen || msg[2];
	response[3] = header.hops || 0x0;
	response.writeUInt32BE(header.xid || msg.xid, 4, true);
	response.writeUInt32BE( msg.xid, 4, true);
	response.writeUInt16BE(header.secs || 0x0000, 8, true);
	response.writeUInt16BE(header.flags || 0x0000, 10, true);
	response.writeUInt32BE(header.ciaddr || 0x00000000, 12, true);
	response.writeUInt32BE(header.yiaddr || 0x00000000, 16, true);
	response.writeUInt32BE(header.siaddr || 0x00000000, 20, true);
	response.writeUInt32BE(header.giaddr || 0x00000000, 24, true);
	response.write( util.macToBuf( header.chaddr || msg.chaddr).toString() , 28, 34);
	response.fill( 0x00 , 34, 44);
	response.fill( 0x00 ,  44, 108);
	response.fill( 0x00 ,  108, 236);
	response.writeUInt32BE(header.magicCookie || msg.magicCookie || 0x63825363, 236, true);
	//this.socket.send(response);
var buf=response;
//this.socket.send(buf, 0, buf.length, 68, msg.ciaddr && msg.ciaddr != "0.0.0.0" ? msg.ciaddr : "255.255.255.255", function(err, i, j){
this.socket.send(buf, 0, buf.length, 68, "10.0.0.255", function(err, i, j){
console.log(err, i, j);
});;
};

var util = require('../util'),
	options = require('../options'),
	parsers = require('../parsers');

module.exports = function(message, response, cb) {

	var _header = new Buffer(240);

	var empty32Buffer = new Buffer(4);
	empty32Buffer.fill(0x00, 0, 4);

	_header[0] = response.op || 0x1;
	_header[1] = response.htype || message[1];
	_header[2] = response.hlen || message[2];
	_header[3] = response.hops || 0x0;
	_header.writeUInt32BE(response.xid || message.xid, 4, true);
	_header.writeUInt16BE(response.secs || 0x0000, 8, true);
	_header.writeUInt16BE(response.flags || 0x0000, 10, true);

	(util.ipToBuf(response.ciaddr) || empty32Buffer).copy(_header, 12);
	(util.ipToBuf(response.yiaddr) || empty32Buffer).copy(_header, 16);
	(util.ipToBuf(response.siaddr) || empty32Buffer).copy(_header, 20);
	(util.ipToBuf(response.giaddr) || empty32Buffer).copy(_header, 24);
	(util.macToBuf(response.chaddr || message.chaddr)).copy(_header, 28, 0, 6);
	_header.fill(0x00, 34, 44);

	_header.write(response.sname || message.sname, 44, 108, "utf-8");
	_header.write(response.file || message.file, 108, 236, "utf-8");
	_header.writeUInt32BE(response.magicCookie || message.magicCookie || 0x63825363, 236, true);

	var _options = [],
		temp;


	var createBuffer = function(code) {
		if (response.options[code] && response.options[code].length === 0) {
			return null;
		}
		if (response.options[code] == null && options.options[code]['default'])
			return options.options[code] * ['default'];

		return parsers.parsers[options.options[code].type].write(response.options[code]);
	}

	console.log(response.options);
	for (var code in response.options) {

		if (options.options[code] instanceof Array) {
			temp = Buffer.concat(response.options[code].map(createBuffer, this));
		} else {
			temp = createBuffer(code);
		}

		_options.push(new Buffer([code]))
		if (temp && temp.length != 0) {
			_options.push(new Buffer([temp.length]));
			_options.push(temp);
		}
	}
	var buf = Buffer.concat([_header].concat(_options));

	if (buf.length < 300) {
		buf = Buffer.concat([buf, new Buffer(new Array(300 - buf.length))]);
	}

	this.socket.send(buf, 0, buf.length, 68, "172.16.42.255" || (this.config && this.config.broadcast) || '255.255.255.255', cb);
	cb(true);

	return buf;


}
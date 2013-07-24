var _ = require('underscore');
var DHCP = {
	util: require('../util')
};

var conf = {};

var options = {
	'53': 0x2,
	'54': conf.serverIp,
	'51': 3600,
	'58': 36,
	'59': 36,
	'1': conf.netmask,
	'3': conf.gateway,
	0xff: true,
};


var memory = {};
var findIpWithoutName = function(inp, out, cb) {
	DHCP.util.findAvailableIP("192.168.3.10", "192.168.3.20", memory, function(err, ip) {
		//memory[ip] = true;
		out.yiaddr = ip;
		cb(err);
	});
};


module.exports = {

	discover: function(inp, out, cb) {
		_.extend(out, {
			op: 2,
			siaddr: conf.nextServer,
			flags: inp.flags,
			secs: inp.secs,
			//sname : conf.sname,
			file: conf.filename,

		});;

		return findIpWithoutName(inp, out, cb);

	}
}
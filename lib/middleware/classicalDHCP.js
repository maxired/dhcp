var _ = require('underscore');
var DHCP = {
	util: require('../util')
};



module.exports = function(conf) {
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

	var memory = conf.reservedIP || {};

	var findIpWithoutName = function(inp, out, cb) {
		DHCP.util.findAvailableIP(conf.beginIP, conf.endIP, memory, function(err, ip) {
			//memory[ip] = true;
			out.yiaddr = ip;
			cb(err);
		});
	};

	return {
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

		},
		request: function(inp, out, cb) {
			_.extend(out, {
				op: 5,
				siaddr: conf.nextServer,
				flags: inp.flags,
				secs: inp.secs,
				//sname : conf.sname,
				file: conf.filename,

			});;

			return findIpWithoutName(inp, out, cb);


		}
	}
}
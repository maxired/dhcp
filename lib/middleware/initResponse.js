module.exports = function(conf) {

	conf = conf || {};
	return {
		discover: function(message, response, cb) {

			var options = {
				'53': 0x2,
				'54': conf.serverIp,
				'51': 3600,
				'58': 36,
				'59': 36,
				'1': conf.netmask,
				'3': conf.gateway,
				0xff: null,
			};

			response.options = options;
			cb();
		}
	}
}
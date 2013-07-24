var DHCP = require('../lib/reserver');
var server = new DHCP();

var classicalDHCP = require('../lib/middleware/classicalDHCP');
var IPByName = require('../lib/middleware/IPByName');


server.use('request', function(message, response) {
	console.log('request received');
});

server.use('discover', function(message, response, cb) {

	var next = function() {
		classicalDHCP.discover(message, response, cb);
	};

	if (message.options['12']) {
		IPByName.discover(message, response, function(err) {
			if (response.yiaddr)
				cb(null);
			else
				next();
		});
	} else next();

});


server.use('message', function(message, response, cb) {
	//console.log('message received', arguments);
	return cb();
});


server.listen('0.0.0.0', 67);
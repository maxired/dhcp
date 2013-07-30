var DHCP = require('../lib/reserver');
var server = new DHCP();

var initResponse = require('../lib/middleware/initResponse')({
	serverIp: "172.16.42.1",
	netmask: '255.255.255.0',
	gateway: '172.16.42.1'
});
var classicalDHCP = require('../lib/middleware/classicalDHCP')({
	beginIP: '172.16.42.30',
	endIP: '172.16.42.30'
});
var IPByName = require('../lib/middleware/IPByName');

server.use('discover', initResponse.discover);
server.use('request', initResponse.request );

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


server.use('request', classicalDHCP.request);

server.use('message', function(message, response, cb) {
	//console.log('message received', arguments);
	return cb();
});


server.listen('0.0.0.0', 67);
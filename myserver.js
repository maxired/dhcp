
var DHCP = require('./index.js');
server = new DHCP.server("0.0.0.0" , function(){
		server.on("message", function(msg){

			});

		server.on("request" , function(msg ) { 
			console.log("reqeust");
			} );
		server.on("discover" , function(msg ) {
			console.log("discover");
			if(!msg) return; 

			var options = {
			'51':3600,
			'53':0x2,
			'54' : DHCP.util.ipToBuf("10.0.0.7"),
			};


			msg.respond({
op:2,
siaddr : DHCP.util.ipToBuf("10.0.0.7").readUInt32BE(0),
yiaddr : DHCP.util.ipToBuf("10.0.0.12").readUInt32BE(0),
flags : msg.flags,
secs : msg.secs,

}, options );
console.log("discover", msg.xid, msg.flags, msg.giaddr, msg.chaddr, msg.options );
} );



console.log("listening");

});

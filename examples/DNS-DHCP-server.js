
var DHCP = {server : require('../lib/server'),util : require('../lib/util')};
dns = require('dns');

/* Sample configuration
   var conf = {
netmask : "255.255.255.0",
serverIp : "10.0.0.7",
address : "0.0.0.0",
broadcast : "10.0.0.255",
dns : "8.8.8.8",
domainName : "my.domain.net",
}
 */


module.exports = function(){

  return {

start :function(conf){

         var domainNameRegexp = RegExp( conf.domainName.split('.').join('\\.'));
         var getIpFromName = function(name, cb){
           name = domainNameRegexp.test(name) ? name : name+'.'+conf.domainName;  
           dns.resolve4(name, function(err, addresses) {
               if(err) throw err;
               cb(err, addresses);
               } );
         };

         server = new DHCP.server( conf , function(){
             server.on("message", function(msg){

               });

             server.on("request" , function(msg ) { 

               //we want to send a DHCPACK
               var options = {
               '53':0x5,
               '1': conf.netmask,
               '28':conf.broadcast,
               '3': conf.serverIp ,
               '15': conf.domainName,
               '6': conf.dns,
               '12': msg.options['12'],
               '26': 1500,
               '51':3600,
               0xff : true,
               }

               if(options['12']){
               getIpFromName(options['12'], function(err, addresses){



                 msg.respond({
op:2,
siaddr : conf.serverIp,
yiaddr: addresses[0],
flags:msg.flags,
secs:msg.secs
}, options);


                 } );
} ;

                 } );


server.on("discover" , function(msg ) {
console.log("discover");
    if(!msg) return; 

    var options = {
    '53':0x2,
    '54' :conf.serverIp,
    '51':3600,
    '58':36,
    '59':36,
    '1' : conf.netmask,
    '3': conf.serverIp,
    0xff : true,
    };

    if(msg.options['12']){
    getIpFromName(msg.options['12'], function(err, addresses){
      msg.respond({
op:2,
siaddr : conf.serverIp,
yiaddr : addresses[0],
flags : msg.flags,
secs : msg.secs,

}, options );
      } );




};

});

console.log("listening");

});



}
}

}();







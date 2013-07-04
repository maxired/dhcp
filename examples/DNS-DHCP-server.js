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
ipRangeStart : "10.0.0.10",
ipRangeEnd : "10.0.0.25",
}
 */

var givenIP={};

var extendOptions = function(conf, options){
  Object.keys(conf.options).forEach(function(key){
      options[key] = conf.options[key]; });
  return options;
};




module.exports = function(){




  return {

start :function(conf){

         var domainNameRegexp = RegExp( conf.domainName.split('.').join('\\.'));

         var getIpFromName = function(name, cb){
           name = domainNameRegexp.test(name) ? name : name+'.'+conf.domainName;  
           dns.resolve4(name, function(err, addresses) {
               cb(err, (addresses && addresses[0]) ? addresses[0]: null);
               } );
         };

         var getNameFromIp = function(ip, cb){
           dns.reverse(ip, function(err, domains){
               if(err) return cb(err);
               if(!domains || domains.length===0) 
               return cb(new Error("no name retireved"));
               console.log(" ip ", ip , "domains", domains);
               return  cb(err, domains[0]);
               });
         }

         var findIpWithoutName = function(cb){
           DHCP.util.findAvailableIP(conf.ipRangeStart, conf.ipRangeEnd , givenIP, function(err, ip){
               if(err) return cb(err);             
               getNameFromIp(ip, function(err2, name){ return cb(err||err2, ip, name)});});
         };
         
        var findIp = function(msg, cb){
           if(msg.options['12']){
             return getIpFromName(msg.options['12'], function(err, ip,name){
                 if(err) {
                    return findIpWithoutName(cb);
                 }
                return cb(err, ip, name)
                 });
           }else{
             return findIpWithoutName(cb);
           };
         }
         
        server = new DHCP.server( conf , function(){
             server.on("message", function(msg){

               });

             server.on("request" , function(msg ) { 
               console.log("request");
               //we want to send a DHCPACK
               var options = {
               '53':0x5,
               '1': conf.netmask,
               '28':conf.broadcast,
               '3': conf.gateway ,
               '15': conf.domainName,
               '6': conf.dns,
               '12': msg.options['12']||"",
               '26': 1500,
               '51':3600,
               0xff : true,
               }

               options = extendOptions( conf, options);

               findIp( msg , function(err, ip, name){
                 if(err) console.log(err, msg.options['12']);               
                 if(name) options['12']=name;
                 msg.respond({
op:2,
siaddr : conf.nextServer,
yiaddr: ip,
flags:msg.flags,
secs:msg.secs,
//sname : conf.sname,
file : conf.filename,
}, options, function(err, len){
givenIP[ip]=true;
});


                 } );


});


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
    '3': conf.gateway,
    0xff : true,
    };

    options = extendOptions( conf, options);


    findIp( msg , function(err, ip){

      msg.respond({
op:2,
siaddr : conf.nextServer,
yiaddr : ip,
flags : msg.flags,
secs : msg.secs,
//sname : conf.sname,
file : conf.filename,

}, options );
      } );




});


console.log("listening");

});



}
}

}();







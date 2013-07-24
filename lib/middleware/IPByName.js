var DHCP = {
  util: require('../util')
};
dns = require('dns');

var conf = { 
  domainName :  "realhostip.com"
};

module.exports = {

  discover: function(inp, out, cb) {

    var domainNameRegexp = RegExp(conf.domainName.split('.').join('\\.'));

    var getIpFromName = function(name ,cb) {
      name = domainNameRegexp.test(name) ? name : name + '.' + conf.domainName;
      dns.resolve4(name, function(err, addresses) {
        console.log(err);
        cb(err, (addresses && addresses[0]) ? addresses[0] : null);
      });
    };

    getIpFromName(inp.options['12'], function(err, ip, name) {
      out.yiaddr = ip;
      return cb(null);
    });
  }
}
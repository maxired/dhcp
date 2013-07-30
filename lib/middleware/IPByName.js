var DHCP = {
  util: require('../util')
};
dns = require('dns');

var conf = {
  domainName: "realhostip.com"
};


var async = require('async');

module.exports = {

  discover: function(inp, out, cb) {

    var domainNameRegexp = RegExp(conf.domainName.split('.').join('\\.'));

    var getIpFromName = function(name, cb) {
      name = domainNameRegexp.test(name) ? name : name + '.' + conf.domainName;

      async.parallel(
        [
          function(cb) {
            dns.resolve4(name, function(err, addresses) {
              cb(err || true, (addresses && addresses[0]) ? addresses[0] : null);
            });
          },
          function(cb) {
            setTimeout(function() {
              cb(true)
            }, 500);
          }
        ], function(err, results) {
          if (results && results[0])
            cb(null, results[0], name);
          else cb(err);
        }
      )

    };

    getIpFromName(inp.options['12'], function(err, ip, name) {
      out.yiaddr = ip;
      return cb(null);
    });
  }
}
var util = module.exports = {
  bufToIp: function(buf, offset) {
    var ip = [],
      offset = offset || 0;
    for (var i = 0; i < 4; i++)
      ip.push(buf[i + offset].toString(10))

    return ip.join(".");
  },
  ipToBuf: function(ip) {
    if (typeof ip == "string")
      return new Buffer(ip.split(".").map(function(dec) {
        return parseInt(dec, 10)
      }));
    else
      return null;
  }

  ,
  bufToMac: function(buf, offset) {
    var mac = [],
      offset = offset || 0,
      hex;
    for (var i = 0; i < 6; i++) {
      hex = buf[i + offset].toString(16).toUpperCase();
      mac.push(hex.length == 2 ? hex : "0" + hex);
    }


    return mac.join("-");
  },
  macToBuf: function(mac) {
    if (typeof mac == "string")
      return new Buffer(mac.split("-").map(function(hex) {
        return parseInt(hex, 16)
      }));
    else
      return null;
  },
  findAvailableIP: function(ipStart, ipEnd, reservedIp, cb) {
    if (typeof reservedIp === 'function') {
      cb = reservedIp;
      reservedIp = {};
    }

    var ipNumToBuff = function(ipNumber) {
      var tmpBuffer = new Buffer(4);
      tmpBuffer.writeUInt32BE(ipNumber, 0);
      return util.bufToIp(tmpBuffer);
    };

    var reservedIp = Object.keys(reservedIp).reduce(function(memo, key) {
      memo[util.ipToBuf(key).readUInt32BE(0)] = true;
      return memo;
    }, {});
    var blocIpStart = util.ipToBuf(ipStart).readUInt32BE(0);
    var blocIpEnd = util.ipToBuf(ipEnd).readUInt32BE(0);
    for (var ip = blocIpStart; ip <= blocIpEnd; ip++) {
      if (!reservedIp['' + ip]) {
        return cb(null, ipNumToBuff(ip));
      }
    }
    cb(null, null);
  },
};

;
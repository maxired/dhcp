var fs = require("fs"),
	path = require("path");

var _parsers = {};

var self = module.exports = {

	addParsers: function(parsers) {
		if (parsers instanceof Array)
			parsers.forEach(self.addParser, this);
		else
			for (var name in parsers)
				self.addParser(name, parsers[name]);
	},
	addParser : function(name, parser) {
		if (typeof name == "object")
			self.parsers[name.name] = name;
		else
			self.parsers[name] = parser;
	},
	parsers: _parsers

};

var jsRegexp = /\.js$/;

var parsersPath = path.dirname(module.filename);
fs.readdirSync(parsersPath)
	.filter(function(file) {
		return jsRegexp.test(file)
	}).filter(function(file){
		return file!="index.js";
	})
	.forEach(function(file) {
		self.addParsers(require(path.join(parsersPath, file)));
	}, this);
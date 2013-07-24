var fs = require("fs"),
	path = require("path");

var _options = {};

var self = module.exports = {

	addOptions: function(options) {
		if (options instanceof Array)
			options.forEach(self.addOption, this);
		else
			for (var name in optionsPath)
				self.addOption(name, options[name]);
	},
	addOption : function(name, option) {
		if (typeof name == "object")
			self.option[name.name] = name;
		else
			self.options[name] = option;
	},
	options : _options

};

var jsRegexp = /\.js$/;

var optionsPath = path.dirname(module.filename);
fs.readdirSync(optionsPath)
	.filter(function(file) {
		return jsRegexp.test(file)
	}).filter(function(file){
		return file!="index.js";
	})
	.forEach(function(file) {
		self.addOptions(require(path.join( optionsPath, file)));
	}, this);
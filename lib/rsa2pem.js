var NodeRSA = require('node-rsa');
var fs = require('fs');

exports.fromJsonFile = function(path) {
	var json = JSON.parse(fs.readFileSync(path));
	if(!json || !json['private_key']) {
		console.log('[ERROR]JSON file error...');
		throw "JSON file error exception..."
	}

  var keyData = json.private_key;
  var key = new NodeRSA();
  key.importKey(keyData, 'pkcs8');
  return key.exportKey('pkcs8-private-pem'); 
}

/**
 * Google service account authentication class
 */
var GAPI = require('gapitoken')
  , request = require('request')
  , nu = require('nodeutil')
  , log = nu.simplelog
  , fs = require('fs')
  , util = require('util')
  , cfg = {}
  , client_secrets
  , key
  , opts
  , key_cache = false //key:'', ctime: ''
  , rsa2pem = require('./rsa2pem')
  , tmp_file_path = '/tmp';

/**
 * initial for service account
 *
 * @param {object} cfg The configure info for api auth use.
 */
exports.init = function(_cfg) {
  if(_cfg['json_file']) {
    log.trace('Got file path:', _cfg['json_file']);
    var jsonFile = JSON.parse(fs.readFileSync(_cfg['json_file']));
    _cfg['client_email'] = jsonFile['client_email'];
    _cfg['key'] = rsa2pem.fromJsonFile(_cfg['json_file']);
    //_cfg['key_file'] = _cfg['json_file'];
  }
  check(_cfg, ['client_secret' , 'key_pem' , 'scope']);
  /**
   * From admin console, create a service account, save the client_secrets.json and it's key
   * Translate p12 to pem
   * $ openssl pkcs12 -in privatekey.p12 -out privatekey.pem -nocerts
   * $ openssl rsa -in privatekey.pem -out key.pem
   *
   * or
   *
   * $ openssl pkcs12 -in privatekey.p12 -nodes -nocerts > key.pem
   */
  if(cfg['client_secret'])
  client_secrets = JSON.parse(fs.readFileSync(cfg['client_secret'],'utf8'))

  opts = {
    iss: _cfg.client_email || client_secrets.web.client_email,
    scope: cfg['scope'], 
    keyFile: cfg['key_pem']
  };

  if(_cfg['key']) 
    opts['key'] = _cfg['key'];
  else
    opts['keyFile'] = _cfg['key_pem']

  if(_cfg['timeout']) 
    opts['timeout'] = _cfg['timeout'];

  log.trace('client_sescets:',client_secrets);
  log.trace('opts:',opts);
}

/**
 * Check the init parameters
 *
 * @param {object} cfg The wrapper of configure
 * @param {array} items The string array for check
 */
function check(_cfg, items) {
  items.forEach(function(item, i){
    if(!_cfg[item]) {
      if(item == 'client_secret' && _cfg['client_email']) { //update for new version of google service account that already no client_secrets.json
        return;
      } if( item == 'key_pem' && _cfg['key'] ) {
        return;
      } else {
        log.error('[ERROR] still not init or not config ' + item);
        throw {error: '[ERROR] still not init or not config ' + item};
      }
    }
    cfg[item] = _cfg[item];
  })
}
  
/**
 * Got auth token
 * @param {function} jobfn The function with access token as input. For api query use. 
 */
function doJobWithAuth(jobfn) {
  var tmpTokenPath = tmp_file_path + '/gtoken.json';
  function isKeyOk(){
    key_cache = key_cache ? key_cache : 
      (fs.existsSync(tmpTokenPath) ? JSON.parse(fs.readFileSync(tmpTokenPath, 'utf-8')) : null);
    if(!key_cache || //new Date().getTime() - key_cache['ctime'] < 30000 ||
        new Date().getTime() > key_cache['ctime'] + 30*1000) {
      log.trace('will re-fetch token...');
      return false;
    }
    return true;
  }

  var saveToken = function(_tokenObj) {
    if(_tokenObj) {
      key_cache = {
        key: _tokenObj,
        ctime: new Date().getTime()
      }
      log.trace('Saving cache...');
      fs.writeFileSync(tmpTokenPath, JSON.stringify(key_cache), 'utf-8');
    }
  }

  var tokenTxt = isKeyOk() ? key_cache['key'] : null;
  if(tokenTxt){
    jobfn(tokenTxt);
    log.trace('read token from cache');
  } else {
    var gapi = new GAPI(opts, function(err) {
      if (err) return log.error(err); 
      gapi.getToken(function(err, token) {
        if (err)  return log.error(err); 
        saveToken(token);
        jobfn(token);
        log.trace('read new token...');
      });     
    });
  }
}

/**
 * Request for authed session. This is a mapping to request module.
 * 
 * @param {object} qopts Wrapper the request option objects
 */
exports.request = function(qopts, cb) {
  doJobWithAuth(function(token) {
    if(!qopts["headers"]) qopts["headers"] = {};
    qopts["headers"]["Authorization"] = "Bearer " + token;
    //Add timeout setting
    if(opts && opts['timeout']) qopts['timeout'] = opts['timeout'];
    log.trace('Request options:', qopts);
    request(qopts, cb?cb:commonCb);
  });
}

/**
 * Request with download file to given path
 * @param {object} qopts Wrapper the request option objects
 * @param {string} destPath The file write destination path
 */
exports.requestDownload = function(qopts, destPath, cb) {
  doJobWithAuth(function(token) {
    if(!qopts["headers"]) qopts["headers"] = {};
    qopts["headers"]["Authorization"] = "Bearer " + token;
    //Add timeout setting
    if(opts && opts['timeout']) qopts['timeout'] = opts['timeout'];
    log.trace('Request options:', qopts);
    // return 
    if(cb) 
      cb(request(qopts));
    else
      request.pipe(fs.createWriteStream(destPath));
  });
}

/**
 * Get request object for authed session. Include the token inside
 * 
 * @param {object} qopts Wrapper the request option objects
 */
exports.getRequest = function(qopts, cb) {
  doJobWithAuth(function(token) {
    if(!qopts["headers"]) qopts["headers"] = {};
    qopts["headers"]["Authorization"] = "Bearer " + token;
    //Add timeout setting
    if(opts && opts['timeout']) qopts['timeout'] = opts['timeout'];
    log.trace('Request options:', qopts);
    // return 
    if(cb) 
      cb(request(qopts));
    else
      commonCb();
  });
}

/**
 * Check object is json or not
 * 
 * @param {object} value The value for check
 */
function isJSON(value) {
  try {
    if(typeof(value) == 'string')
      JSON.parse(value);
    else
      JSON.stringify(value)
    return true;
  } catch (ex) {
    return false;
  }
}

/**
 * Common callback
 *
 * @param {object} error The error message
 * @param {object} request HTTP(S) request object
 * @param {object} doc HTTP(S) request result
 */
exports.commonCb = commonCb;
function commonCb(e,r,d) {
  if(e) log.error(e)
  log.trace('[commonCb]', d);
}

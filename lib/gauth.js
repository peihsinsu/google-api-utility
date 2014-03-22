var GAPI = require('gapitoken')
  , request = require('request')
  , nu = require('nodeutil')
  , log = nu.logger.getInstance('gauth')
  , fs = require('fs')
  , util = require('util')
  , cfg = {}
  , client_secrets
  , key
  , opts
  , key_cache = false;//key:'', ctime: ''

/**
 * initial for service account
 */
exports.init = function(_cfg) {
  check(_cfg, ['client_secret','privatekey_pem','key_pem', 'scope']);
  /**
   * From admin console, create a service account, save the client_secrets.json and it's key
   * Translate p12 to pem
   * $ openssl pkcs12 -in privatekey.p12 -out privatekey.pem -nocerts
   * $ openssl rsa -in privatekey.pem -out key.pem
   */
  client_secrets = JSON.parse(fs.readFileSync(cfg['client_secret'],'utf8'))
  key = fs.readFileSync(cfg['privatekey_pem'], 'utf8');

  opts = {
    iss: client_secrets.web.client_email,
    scope: cfg['scope'], 
    keyFile: cfg['key_pem']
  };

  log.info('client_sescets:',client_secrets);
  log.info('key:',key);
  log.info('opts:',opts);
}

/**
 * Check the init parameters
 */
function check(_cfg, items) {
  items.forEach(function(item, i){
    if(!_cfg[item]) {
      log.error('[ERROR] still not init or not config ' + item);
      process.exit(1);
    }
    cfg[item] = _cfg[item];
  })
}
  
/**
 * Got auth token
 */
function doJobWithAuth(jobfn) {
  var tmpTokenPath = '/tmp/gtoken.json';
  function isKeyOk(){
    key_cache = key_cache ? key_cache : 
      (fs.existsSync(tmpTokenPath) ? JSON.parse(fs.readFileSync(tmpTokenPath, 'utf-8')) : null);
    if(!key_cache || new Date().getTime() - key_cache['ctime'] > 30000) {
      return false;
    }
    return true;
  }

  var saveToken = function(_tokenObj) {
    if(isJSON(_tokenObj)) {
      key_cache = {
        key: _tokenObj,
        ctime: new Date().getTime()
      }
      log.info('Saving cache...');
      fs.writeFileSync(tmpTokenPath, JSON.stringify(key_cache), 'utf-8');
    }
  }

  var tokenTxt = isKeyOk() ? key_cache['key'] : null;
  var tokenObj = tokenTxt && isJSON(tokenTxt) ? tokenTxt : null ;

  if(tokenObj && tokenObj.token) {
    jobfn(tokenObj.token);
    log.info('read token from cache');
  } else {
    var gapi = new GAPI(opts, function(err) {
      if (err) return log.error(err); 
      gapi.getToken(function(err, token) {
        if (err)  return log.error(err); 
        var tokenObj = {};
        tokenObj.token = token;
        tokenObj.start_time = new Date().getTime();
        saveToken(tokenObj);
        jobfn(token);
        log.info('read new token...');
      });     
    });
  }
}

/**
 * Request for authed session
 */
exports.request = function(qopts, cb) {
  doJobWithAuth(function(token) {
    if(!qopts["headers"]) qopts["headers"] = {};
    qopts["headers"]["Authorization"] = "Bearer " + token;
    log.info(qopts);
    request(qopts, cb?cb:commonCb);
  });
}

/**
 * Check object is json or not
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
 */
exports.commonCb = commonCb;
function commonCb(e,r,d) {
  if(e) log.error(e)
  if(!cb) 
    console.log(d)
  else
    cb(d);
}
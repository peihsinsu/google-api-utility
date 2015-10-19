# google-api-utility

This is a auth api wrapper (we use gapitoken module) and add a request method for api call. It use service account for authenticate, and persistance the key in cache and file. 

We still not implement the refresh token, will be implement next release.

## Install 

```
npm install google-api-utility
```

## Apply service account

Follow the doc: http://gappsnews.blogspot.tw/2013/10/connect-cloud-platform-bigquery-using.html

## Convert p12 key

From admin console, create a service account, save the client_secrets.json and it's key
ex: Translate p12 to pem

```
openssl pkcs12 -in privatekey.p12 -out privatekey.pem -nocerts
openssl rsa -in privatekey.pem -out key.pem

or

openssl pkcs12 -in privatekey.p12 -nodes -nocerts > key.pem
```

## Use for Google API request

You need to initial with auth.init() to put the scope, client_secret, privatekey_pem, key_pem parameters. These are we describe before. And we must to specify the scope for our query api, too.

```
var auth = require('google-api-utility')
  , request = auth.request
  , util = require('util')
  , project = 'your-project-id';

auth.init({
  scope: 'https://www.googleapis.com/auth/bigquery https://www.googleapis.com/auth/cloud-platform',
  client_secret: '/path-to-client_secret.json',
  key_pem: '/path-to-key.pem'
});

var bqurl = 'https://www.googleapis.com/bigquery/v2/projects/%s/datasets';
request({
    url: util.format(bqurl, project),
    method: 'GET'
}, function(err, req, doc){
  if(err) console.log(err);
	console.log(doc);  
});

```

About 2015Q1 end, google start to deprecate the client_secret file download. You can change the init method like this:

```
auth.init({
  scope: 'https://www.googleapis.com/auth/bigquery https://www.googleapis.com/auth/cloud-platform',
  client_email: 'your-client-email@developer.gserviceaccount.com',
  key_pem: '/path-to-key.pem'
});
```

The client_email can be find in project credential page. (Page url like: https://console.developers.google.com/project/[YOUR-PROJECT-ID]/apiui/credential)

## Now support json secret file setting

Because GCP currently have json secret file. We currently support to initial it using json file:

```
auth.init({
  scope: 'https://www.googleapis.com/auth/devstorage.full_control https://www.googleapis.com/auth/devstorage.read_write https://www.googleapis.com/auth/cloud-platform',
  json_file: '/path/to/your-file.json'
});
```

## Request timeout setting

Use timeout parameter in init function, and will be set in request timeout.

```
auth.init({
  ...,
  timeout: 1000
})
```

## Credit

The module bellow are my implements use this lib.

* https://github.com/peihsinsu/bigquery

google-api-utility
----

# Install 

```
npm install google-api-utility
```

# Use

```
var auth = require('google-api-utility')
  , request = auth.request;

auth.init({
  client_secret: '/path-to-client_secret.json',
  privatekey_pem: '/path-to-privatekey.pem',
  key_pem: '/path-to-key.pem'
});

var bqurl = 'https://www.googleapis.com/bigquery/v2/projects/%s/datasets';
request({
    url: util.format(bqurl, project),
    method: 'GET'
}, function(err, req, doc){
  
});

```
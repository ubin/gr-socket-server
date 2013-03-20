var assert = require('assert')
  , http = require('http')
  , app = require('./app')
  , callbackFired = false;

app.server.listen(80);

http
  .cat('http://localhost')
  .addCallback(function(data) {
    callbackFired = true;
    //assert.equal('hello world', data);
    app.server.close();
console.write('tes');
  });

process.addListener('exit', function() {
  assert.ok(callbackFired);
});

var assert = require('assert')
  , http = require('http')
  , greenroom = require('./app')
  , callbackFired = false;

greenroom.server.listen(80);

http
  .cat('http://localhost')
  .addCallback(function(data) {
    callbackFired = true;
    //assert.equal('hello world', data);
    greenroom.server.close();
console.write('tes');
  });

process.addListener('exit', function() {
  assert.ok(callbackFired);
});
var expect = require('chai').expect;
var middleware = require('../..');

describe('cli-middleware:', function() {
  it('should return closure', function(done) {
    expect(middleware).to.be.a('function');
    var closure = middleware();
    expect(closure).to.be.a('function');
    done();
  });
})

var expect = require('chai').expect
  , funcname = require('../..').funcname;

describe('cli-middleware:', function() {

  it('should return null on non-function', function(done) {
    expect(funcname('foo')).to.eql(null);
    done();
  });

  it('should return null on anonymous function', function(done) {
    expect(funcname(function(){})).to.eql(null);
    done();
  });

})

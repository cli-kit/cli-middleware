var expect = require('chai').expect;
var raise = require('../..').raise;

describe('cli-middleware:', function() {
  it('should raise error string', function(done) {
    function func() {
      raise('mock error');
    }
    expect(func).to.throw(Error);
    done();
  });

  it('should raise error instance', function(done) {
    function func() {
      raise(new Error('mock error'));
    }
    expect(func).to.throw(Error);
    done();
  });
})

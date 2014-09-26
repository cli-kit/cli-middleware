var expect = require('chai').expect;
var wrap = require('../..').wrap;

describe('cli-middleware:', function() {
  it('should wrap errors', function(done) {
    expect(wrap('mock error')).to.be.instanceof(Error);
    expect(wrap(new Error())).to.be.instanceof(Error);
    expect(wrap(null)).to.be.instanceof(Error);
    done();
  });
})

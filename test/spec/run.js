var expect = require('chai').expect;
var events = require('events');
var middleware = require('../..');

var syslog = {
  trace: function(){}
}

describe('cli-middleware:', function() {
  it('should run closure', function(done) {
    var list = [
      function mockmiddle(req, next) {
        expect(req).to.be.an('object');
        expect(next).to.be.a('function');
        done();
      }
    ]
    var opts = {list: list};
    var closure = middleware(opts);
    closure([]);
  });

  it('should complete on empty list', function(done) {
    var list = [];
    var opts = {list: list};
    var closure = middleware(opts);
    closure([], function(err, req) {
      expect(req).to.be.an('object');
      done();
    });
  });

  it('should allow no callback', function(done) {
    var list = [];
    var opts = {list: list};
    var closure = middleware(opts);
    closure();
    done();
  });

  it('should run closure and invoke callback', function(done) {
    var called = false;
    var list = [
      function mockmiddle(req, next) {
        called = true;
        next();
      }
    ]
    var opts = {list: list};
    var closure = middleware(opts);
    closure([], function(err, req) {
      expect(called).to.eql(true);
      expect(req).to.be.an('object');
      done();
    });
  });

  it('should execute multiple middleware functions', function(done) {
    var called = [];
    var list = [
      function mockmiddle1(req, next) {
        called.push(true);
        expect(req).to.be.an('object');
        expect(next).to.be.a('function');
        next();
      },
      function mockmiddle2(req, next) {
        called.push(true);
        expect(req).to.be.an('object');
        expect(next).to.be.a('function');
        next();
      }
    ]
    var opts = {list: list};
    var closure = middleware(opts);
    closure([], function(err, req) {
      expect(called).to.eql([true, true]);
      expect(err).to.eql(null);
      expect(req).to.be.an('object');
      done();
    });
  });


  it('should wrap error string and bail on error', function(done) {
    var list = [
      function mockerrstr(req, next) {
        next('mock error');
      }
    ]
    var opts = {list: list, bail: true, throws: false};
    var closure = middleware(opts);
    closure([], function(err, req) {
      expect(req.argv).to.be.an('array');
      expect(req.complete).to.be.a('function');
      expect(req.errors).to.be.an('object');
      expect(req.errors.has).to.be.a('function');
      expect(req.errors.list).to.be.an('array');
      expect(req.errors.has()).to.eql(true);
      //console.dir(req);
      done();
    });
  });

  it('should wrap error string and not bail on error', function(done) {
    var list = [
      function mockerrstr(req, next) {
        next('mock error');
      },
      function mockerrhandler(req, next) {
        expect(req).to.be.an('object');
        expect(next).to.be.a('function');
        done();
      }
    ]
    var opts = {list: list, bail: false, throws: false};
    var closure = middleware(opts);
    closure();
  });


  it('should use syslog', function(done) {
    var list = [
      function mocksyslog1(req, next) {
        expect(req).to.be.an('object');
        expect(next).to.be.a('function');
        next();
      },
      function mocksyslog2(req, next) {
        expect(req).to.be.an('object');
        expect(next).to.be.a('function');
        done();
      }
    ]
    var opts = {
      list: list, bail: false, throws: false, syslog: syslog, debug: true};
    var closure = middleware(opts);
    closure();
  });

  it('should intercept error and use default behaviour', function(done) {
    var list = [
      function mockerrstr(req, next) {
        next('mock error');
      }
    ]
    var opts = {
      list: list,
      throws: true,
      raise: function(){},
      intercept: function(/*req, next, err, source, parameters, cause*/) {
        return true;
      }
    };
    var closure = middleware(opts);
    closure([], function(err, req) {
      expect(err).to.eql('mock error');
      expect(req).to.be.an('object');
      done();
    });
  });

  it('should raise error when throws is set', function(done) {
    var thrown = false;
    var list = [
      function mockerrstr(req, next) {
        next('mock error');
      }
    ]
    var opts = {
      list: list,
      throws: true,
      raise: function(){thrown = true}
    };
    var closure = middleware(opts);
    closure([], function(err, req) {
      expect(err).to.eql('mock error');
      expect(req).to.be.an('object');
      expect(thrown).to.eql(true);
      done();
    });
  });

  it('should intercept error and call complete()', function(done) {
    var list = [
      function mockerrstr(req, next) {
        next('mock error');
      }
    ]
    var opts = {
      list: list,
      throws: true,
      raise: function(){},
      intercept: function(req, next, err/*, source, parameters, cause*/) {
        req.complete(err)
        return false;
      }
    };
    var closure = middleware(opts);
    closure([], function(err, req) {
      expect(err).to.be.an.instanceof(Error);
      expect(req).to.be.an('object');
      done();
    });
  });

  it('should call complete() on error true', function(done) {
    var list = [
      function mockerrstr(req, next) {
        next(true);
      }
    ]
    var opts = {
      list: list,
      throws: false
    };
    var closure = middleware(opts);
    closure([], function(err, req) {
      expect(err).to.eql(true);
      expect(req).to.be.an('object');
      done();
    });
  });

  it('should call complete() on error bail property', function(done) {
    var list = [
      function mockerrstr(req, next) {
        var e = new Error('mock error bail');
        e.bail = true;
        next(e);
      }
    ]
    var opts = {
      list: list,
      throws: false
    };
    var closure = middleware(opts);
    closure([], function(err, req) {
      expect(err).to.be.an.instanceof(Error);
      expect(req).to.be.an('object');
      done();
    });
  });

  it('should abort processing on EABORT error', function(done) {
    var list = [
      function mockabort(req, next) {
        next(middleware.EABORT);
        done();
      }
    ]
    var opts = {
      list: list,
      throws: false
    };
    var closure = middleware(opts);
    closure([], function(err, req) {
      expect(err).to.eql(null);
      expect(req).to.be.an('object');
      // this should never get called
      done();
    });
  });

  it('should emit complete on scope', function(done) {
    var scope = new events.EventEmitter();
    var list = [
      function mockemitter(req, next) {
        next();
      }
    ]
    var opts = {
      list: list,
      scope: scope,
      throws: false
    };
    scope.on('complete', function oncomplete(err, req) {
      expect(err).to.eql(null);
      expect(req).to.be.an('object');
      done();
    })
    var closure = middleware(opts);
    closure();
  });

  it('should use errors object', function(done) {
    var list = [
      function mockabort(req, next) {
        next('mock error');
      }
    ]
    var opts = {
      list: list,
      throws: false
    };

    var req = {errors: {list: []}};
    var closure = middleware(opts);
    closure([], req, function(err, req) {
      expect(err).to.be.an.instanceof(Error);
      expect(req).to.be.an('object');
      done();
    });
  });

})

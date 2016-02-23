var debug = !!process.env.CLI_TOOLKIT_DEBUG;

/**
 *  Utility used to determine the name of a function.
 *
 *  @param func The function.
 *
 *  @return The string name of the function; null if anonymous.
 */
function funcname(func) {
  if(typeof func !== 'function') {
    return null;
  }
  return func.name || null;
}

/**
 *  Default error wrapping implementation.
 *
 *  @param err Error instance or string.
 *  @param parameters Message replacement parameters.
 *  @param cause An error that caused this error.
 */
function wrap(err/*, parameters, cause*/) {
  if(err instanceof Error) {
    return err;
  }
  if(typeof err === 'string') {
    return new Error(err);
  }
  return new Error('unknown middleware error');
}

/**
 *  Default raise implementation.
 *
 *  @param err Error instance or string.
 *  @param parameters Message replacement parameters.
 *  @param cause An error that caused this error.
 */
function raise(err, parameters, cause) {
  if(!(err instanceof Error)) {
    err = wrap(err, parameters, cause);
  }
  throw err;
}

/**
 *  Retrieve a middleware closure.
 *
 *  @param opts Options for the middleware execution.
 */
function run(opts) {
  opts = opts || {};

  var list = opts.list || []
    , scope = opts.scope || this
    , syslog = opts.syslog
    , bail = opts.bail
    , errs = scope.errors || opts.errors || {}
    , ewrap = scope.wrap || opts.wrap || wrap
    , eraise = scope.raise || opts.raise || raise
    , intercepts = typeof opts.intercept === 'function'
    , emits = typeof scope.emit === 'function'
    , errhandler = opts.intercept
    , dbg = opts.debug || debug;

  /**
   *  Execute middleware.
   *
   *  @param args Array of arguments to parse, assigned to req.argv.
   *  @param req An existing request object to use.
   *  @param cb A complete callback function.
   */
  return function middleware(args, req, cb) {
    if(typeof req === 'function') {
      cb = req;
      req = null;
    }

    var i = 0
      , name;

    req = req || {}

    req.argv = req.argv || args;

    var errors = req.errors || {};

    // keep track of errors that occured
    if(req.errors === undefined) {
      req.errors = req.errors || {cause: null, list: []};
      req.errors.has = function() {
        return this.cause !== null || this.list.length > 0;
      }.bind(req.errors);
      errors = req.errors;
    }

    errors.list = Array.isArray(errors.list) ? errors.list : [];

    function exec() {
      var func = list[i];
      name = funcname(func);
      if(syslog && dbg) {
        syslog.trace('middleware/start: %s', name);
      }
      func.call(scope, req, next);
    }

    function complete(err) {
      var errs = errors.list;
      err = err ||
        (errs.length ? errs[errs.length - 1] : (errors.cause || undefined));
      if(emits && !cb) {
        return scope.emit('complete', err || null, req);
      }
      if(cb) {
        return cb.call(scope, err || null, req);
      }
    }

    req.complete = complete;

    function next(err, parameters, e) {
      //console.log('middleware/end: %s', name);
      if(syslog && dbg) {
        syslog.trace('middleware/end: %s', name);
      }
      var er, runDefaultRaise;
      if(err === null) {
        errors.cause = ewrap.call(scope, errs.EMIDDLEWARE_ABORT);
        // halt processing, complete never fires
        return;
      }else if(err === true || err && err.bail === true) {
        errors.cause = err && err.bail
          ? err : ewrap.call(scope, errs.EMIDDLEWARE_BAIL);
        if(err && err.bail) {
          errors.list.push(err);
        }
        return complete(err);
      }else if(err) {
        er = ewrap.call(scope, err, parameters, e);
        if(opts.throws) {
          if(intercepts) {

            // error intercept handlers should return a boolean
            // indicating whether the default *raise* behaviour
            // is followed
            runDefaultRaise = errhandler.call(
              scope, req, next, er, err, parameters, e);
            if(runDefaultRaise) {
              er = eraise.call(scope, er, parameters, e);
            }else{
              errors.list.push(er);
              // passed flow control to the error intercept handler
              return;
            }
          }else{
            er = eraise.call(scope, err, parameters, e);
          }
        }

        // add the wrapped error to to the list
        errors.list.push(er);

        if(bail) {
          return complete(er || err);
        }
      }
      i++;
      if(i < list.length) {
        exec();
      }else{
        return complete(er || err);
      }
    }
    if(list.length) {
      exec() 
    }else{
      complete();
    }
  }
}

run.wrap = wrap;
run.raise = raise;

module.exports = run;

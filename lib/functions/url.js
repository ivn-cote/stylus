
/*!
 * Stylus - plugin - url
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Compiler = require('../visitor/compiler')
  , events = require('../renderer').events
  , nodes = require('../nodes')
  , parse = require('url').parse
  , extname = require('path').extname
  , utils = require('../utils')
  , fs = require('fs');

/**
 * Mime table.
 */

var defaultMimes = {
    '.gif': 'image/gif'
  , '.png': 'image/png'
  , '.jpg': 'image/jpeg'
  , '.jpeg': 'image/jpeg'
  , '.svg': 'image/svg+xml'
  , '.ttf': 'application/x-font-ttf'
  , '.eot': 'application/vnd.ms-fontobject'
  , '.woff': 'application/font-woff'
};

/**
 * Return a url() function with the given `options`.
 *
 * Options:
 *
 *    - `limit` bytesize limit defaulting to 30Kb
 *    - `paths` image resolution path(s), merged with general lookup paths
 *
 * Examples:
 *
 *    stylus(str)
 *      .set('filename', __dirname + '/css/test.styl')
 *      .define('url', stylus.url({ paths: [__dirname + '/public'] }))
 *      .render(function(err, css){ ... })
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

module.exports = function(options) {
  options = options || {};

  var _paths = options.paths || [];
  var sizeLimit = null != options.limit ? options.limit : 30000;
  var mimes = options.mimes || defaultMimes;

  function fn(url){
    // Compile the url
    var compiler = new Compiler(url);
    compiler.isURL = true;
    url = url.nodes.map(function(node){
      return compiler.visit(node);
    }).join('');

    // Parse literal
    url = parse(url);
    var ext = extname(url.pathname)
      , mime = mimes[ext]
      , hash = url.hash || ''
      , literal = new nodes.Literal('url("' + url.href + '")')
      , paths = _paths.concat(this.paths)
      , buf;

    // Not supported
    if (!mime) return literal;

    // Absolute
    if (url.protocol) return literal;

    // Lookup
    var found = utils.lookup(url.pathname, paths);

    // Failed to lookup
    if (!found) {
      events.emit(
          'file not found'
        , 'File ' + literal + ' could not be found, literal url retained!'
      );

      return literal;
    }

    // Read data
    buf = fs.readFileSync(found);

    // Too large
    if (false !== sizeLimit && buf.length > sizeLimit) return literal;

    // Encode
    return new nodes.Literal(
      (ext === '.svg' && !options.base64ForSvg)
        ? "url('data:" + mime + ", " + encodeSVG(buf.toString()) + hash + "')"
        : 'url("data:' + mime + ';base64,' + buf.toString('base64') + hash + '")'
    );
  };

  fn.raw = true;
  return fn;
};

function encodeSVG(svg) {
    var lines = svg.split('\n'),
      encodedLine = lines.map(function(el) { return el.trim(); }).join(''),
      charactersToEscape = {
        '%': '%25',
        '\\[': '%5B',
        '\\]': '%5D',
        '<': '%3C',
        '>': '%3E',
        '#': '%23',
        '\\^': '%5E',
        '{': '%7B',
        '}': '%7D',
        '\\|': '%7C',
        '\\\\': '%5C'
    };
    for (var symbol in charactersToEscape)
      encodedLine = encodedLine.replace(new RegExp(symbol,'g'), charactersToEscape[symbol]);

    return encodedLine;
}

// Exporting default mimes so we could easily access them
module.exports.mimes = defaultMimes;


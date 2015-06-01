var fs   = require('fs')
var path = require('path')
var pull = require('pull-stream')
var toPull = require('stream-to-pull-stream')
var mlib = require('ssb-msgs')
var mimetype = require('mimetype')

function toBuffer() {
  return pull.map(function (s) { return Buffer.isBuffer(s) ? s : new Buffer(s, 'base64') })
}

module.exports = function(server) {
  var blobPathRegex = /[/]ext[/]([A-z0-9/+=]+\.blake2s)([/][^?]*)?(\?.*)?/i
  return function(req, res, next) {

    var match = blobPathRegex.exec(req.url)
    if (match) {
      var hash     = match[1]
      var filename = match[2] ? match[2].slice(1) : false
      var params   = match[3] ? require('querystring').parse(match[3].slice(1)) : {}

      server.blobs.has(hash, function (err, has) {
        if (err || !has) {
          if ('sp' in params) {
            // Blob search page
            fs.createReadStream(path.join(__dirname, 'html/blob-search.html')).pipe(res)
          }
          else if ('bimg' in params) {
            // Backup asset
            fs.createReadStream(path.join(__dirname, 'img/default-prof-pic.png')).pipe(res)
          } else
            next(err)
        }
        else {
          // Serve blob
          var t = filename ? mimetype.lookup(filename) : false
          if (t) res.setHeader('Content-Type', t)
          res.setHeader('Content-Security-Policy', 'default-src \'none\'')
          pull(
            server.blobs.get(hash),
            toBuffer(),
            toPull.sink(res)
          )
        }
      })
    } else next()
  }
}
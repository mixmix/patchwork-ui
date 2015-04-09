var path    = require('path')
var fs      = require('fs')
var multicb = require('multicb')

var readOpts = { encoding: 'utf-8' }
module.exports = function(server) {
  var pluginsPath = path.join(server.config.path, 'plugins')
  fs.mkdir(pluginsPath, 0744, function (err) {
    if (!err)
      server.emit('log:info', ['phoenix', null, 'created plugins directory', pluginsPath])
    else if (err.code !== 'EEXIST')
      server.emit('log:error', ['phoenix', null, 'error creating plugins directory', { path: pluginsPath, err: err }])
  })

  return function(req, res, next) {
    // Serve the plugins directory
    if (req.url == '/plugins.json') {
      res.setHeader('Content-Type', 'application/json')
      return fs.readdir(pluginsPath, function (err, files) {
        if (err) {
          res.writeHead(500)
          return res.end(JSON.stringify(err))
        }
        var jsfiles = files.filter(function (file) { return (path.extname(file) === '.js') })

        var done = multicb({ pluck: 1 })
        jsfiles.forEach(function (file) { fs.readFile(path.join(pluginsPath, file), readOpts, done()) })
        done(function (err, strs) {
          if (err) {
            res.writeHead(500)
            return res.end(JSON.stringify(err))
          }
          var plugins = { files: {} }
          jsfiles.forEach(function (file, i) { plugins.files[file] = strs[i] })
          res.writeHead(200)
          res.end(JSON.stringify(plugins))
        })
      })
    }

    next()
  }
}
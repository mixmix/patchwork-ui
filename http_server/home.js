var http     = require('http');
var fs       = require('fs');
var path     = require('path');
var WSServer = require('ws').Server
var WSStream = require('websocket-stream')
var ssbapi   = require('secure-scuttlebutt/api')
var pull     = require('pull-stream')
var toPull   = require('stream-to-pull-stream')
var connect  = require('../lib/backend')

function createServer(port, opts) {
  connect(function (err, backendClient, backend) {
    if (err) return console.error(err);

    // Setup periodic syncs :TODO:
    // require('../lib/background-sync')(backendClient, 1000 * 60 * 15)

    // Create HTTP server
    var server = http.createServer(function (req, res) {
      function pathStarts(v) { return req.url.indexOf(v) === 0; }
      function pathEnds(v) { return req.url.indexOf(v) === (req.url.length - v.length); }
      function type (t) { res.writeHead(200, {'Content-Type': t}) }
      function read(file) { return fs.createReadStream(path.join(__dirname, '../web_frontend/' + file)); }
      function serve(file) { return read(file).on('error', serve404).pipe(res) }
      function serve404() {  res.writeHead(404); res.end('Not found'); }
      
      // Static asset routes
      if (req.url == '/' || req.url == '/index.html') {
        type('text/html')
        return serve('html/home.html')
      }
      if (pathStarts('/gui-sandbox')) {
        res.setHeader('Content-Security-Policy', 'default-src \'self\' \'unsafe-inline\'')
        type('text/html')
        return serve('html/gui-sandbox.html')
      }
      if (pathEnds('jpg'))        type('image/jpeg')
      else if (pathEnds('jpeg'))  type('image/jpeg')
      else if (pathEnds('gif'))   type('image/gif')
      else if (pathEnds('ico'))   type('image/x-icon');
      else if (pathEnds('png'))   type('image/png');
      else if (pathEnds('js'))    type('application/javascript')
      else if (pathEnds('css'))   type('text/css')
      else if (pathEnds('woff'))  type('application/x-font-woff')
      else if (pathEnds('woff2')) type('application/font-woff2')
      if (pathStarts('/js/') || pathStarts('/css/') || pathStarts('/img/') || pathStarts('/fonts/'))
        return serve(req.url)
      serve404();
    });
    server.on('connect', function(req, conn, head) {
      // RPC-stream connection
      console.log('Received CONNECT')

      if (!backend) {
        // this is not the RPC server.... this shouldn't happen
        console.error('Unable to handle CONNECT - this is not the RPC server. Weird! Aborting')
        conn.close()
        return
      }

      // :TODO: authentication, perms

      conn.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      var connStream = toPull.duplex(conn)
      pull(connStream, ssbapi.server(backend.ssb, backend.feed).createStream(), connStream)
      
    })
    server.listen(port, '::')

    // Setup the websocket host
    var wss = new WSServer({server: server, path: '/ws'})
    wss.on('connection', function(ws) {
      console.log('WS: new websocket client connected to home server')
      var conn = WSStream(ws)
      conn.on('error', function(err) { console.log('WS ERROR', err) })

      if (!backend) {
        // this is not the RPC server.... this shouldn't happen
        console.error('Unable to handle websocket - this is not the RPC server. Weird! Aborting')
        conn.close()
        return
      }
      
      // :TODO: authentication, perms

      var connStream = toPull.duplex(conn)
      pull(connStream, ssbapi.server(backend.ssb, backend.feed).createStream(), connStream)
    })

    function onExit() { /* :TODO: any cleanup? */ process.exit() }
    process.on('SIGINT', onExit).on('SIGTERM', onExit)
  })
}

module.exports = {
  createServer: createServer
};
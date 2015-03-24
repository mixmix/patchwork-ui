'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var infiniscroll = require('infiniscroll')
var com = require('../com')

var mustRenderOpts = { mustRender: true }
module.exports = function (app, opts) {
  opts = opts || {}
  if (!opts.feed) {
    opts.feed = function listFn (opts) {
      opts.type = 'init'
      return app.ssb.messagesByType(opts)
    }
  }
  function getindex (msg) {
    if (msg)
      return msg.value.timestamp
  }

  // markup
 
  var feed = h('.contact-feed')
  var feedContainer = infiniscroll(h('.contact-feed-container.full-height', feed), { fetchBottom: fetchBottom })
  fetchBottom()

  // message fetch
  
  var cursor, hasMsgs = false
  function fetchBottom (cb) {
    fetchBottomBy(5)
    function fetchBottomBy (amt) {
      var fetchopts = { reverse: true }
      fetchopts[(!hasMsgs) ? 'lte' : 'lt'] = getindex(cursor)
      
      doFetch(fetchopts, function (err, _msgs) {
        if (_msgs && _msgs.length) {
          // nothing new? stop
          if (cursor && cursor.key == _msgs[_msgs.length - 1].key)
            return (cb && cb())

          // advance cursor
          cursor = _msgs[_msgs.length - 1]
          hasMsgs = true

          // filter
          if (opts.filter)
            _msgs = _msgs.filter(opts.filter)

          // render
          _msgs.forEach(function (msg) {
            var el = com.contactSummary(app, msg, opts.follows)
            el && feed.appendChild(el)
          })

          // fetch more if needed
          var remaining = amt - _msgs.length
          if (remaining > 0)
            return fetchBottomBy(remaining)
        }

        cb && cb()
      })
    }
  }

  function doFetch (fetchopts, cb) {
    fetchopts.limit = fetchopts.limit || 30
    pull(opts.feed(fetchopts), pull.collect(function (err, _msgs) {
      cb(err, _msgs)
    }))
  }

  return feedContainer
}
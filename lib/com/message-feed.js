'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')
var u = require('../util')

module.exports = function (app, opts) {
  opts = opts || {}

  var feedState = opts.state
  var feedContainer = null
  if (!feedState)
    feedState = module.exports.makeStateObj()

  if (!opts.feed)
    opts.feed = app.ssb.createFeedStream
  if (!opts.render)
    opts.render = com.message

  var cursor = opts.cursor
  if (!cursor) {
    cursor = function (msg) {
      if (msg)
        return [msg.value.timestamp, msg.value.author]
    }
  }

  // markup
 
  if (!feedState.el)
    feedState.el = h(opts.container||'.message-feed')
  else {
    // update message states
    if (opts.render.fetchRowState) {
      Array.prototype.forEach.call(feedState.el.querySelectorAll('tr'), function (el) {   
        opts.render.fetchRowState(app, el)
     })
    }
  }

  feedContainer = h('.message-feed-container',
    (opts.loadmore) ? h('a.load-more', { href: '#/' }, 'Load More') : '',
    feedState.el)

  // message fetch

  if (!feedState.el.hasChildNodes()) {
    fetchBottom(function (n) {
      if (opts.onempty && n === 0)
        opts.onempty(feedState.el)
    })
  }

  function fetchTop (cb) {
    var numRendered = 0
    fetchTopBy(30)
    function fetchTopBy (amt) {
      var fetchopts = { reverse: false, limit: amt }
      fetchopts.gt = cursor(feedState.topCursor)
      var topmsgEl = feedState.el.children[0]

      doFetch(fetchopts, function (err, _msgs) {
        if (_msgs && _msgs.length) {
          // nothing new? stop
          if (feedState.topCursor && feedState.topCursor.key == _msgs[_msgs.length - 1].key)
            return (cb && cb(numRendered))

          // advance cursors
          feedState.topCursor = _msgs[_msgs.length - 1]
          if (!feedState.bottomCursor)
            feedState.bottomCursor = _msgs[0]

          // filter
          if (opts.filter)
            _msgs = _msgs.filter(opts.filter)

          // render
          var lastEl = feedState.el.firstChild
          for (var i=_msgs.length-1; i >= 0; i--) {
            var el = opts.render(app, _msgs[i])
            if (el) {
              feedState.el.insertBefore(el, lastEl)
              numRendered++
            }
          }

          // maintain scroll position (fetchTop-only behavior)
          if (topmsgEl)
            feedContainer.scrollTop = topmsgEl.offsetTop

          // fetch more if needed
          var remaining = amt - _msgs.length
          if (remaining > 0)
            return fetchTopBy(remaining)
        }

        cb && cb(numRendered)
      })
    }
  }
  function fetchBottom (cb) {
    var numRendered = 0
    fetchBottomBy(30)
    function fetchBottomBy (amt) {
      var fetchopts = { reverse: true, limit: amt }
      fetchopts.lt = cursor(feedState.bottomCursor)
      
      doFetch(fetchopts, function (err, _msgs) {
        if (_msgs && _msgs.length) {
          // nothing new? stop
          if (feedState.bottomCursor && feedState.bottomCursor.key == _msgs[_msgs.length - 1].key)
            return (cb && cb(numRendered))

          // advance cursors
          feedState.bottomCursor = _msgs[_msgs.length - 1]
          if (!feedState.topCursor)
            feedState.topCursor = _msgs[0]

          // filter
          if (opts.filter)
            _msgs = _msgs.filter(opts.filter)

          // render
          _msgs.forEach(function (msg) {
            var el = opts.render(app, msg)
            if (el) {
              feedState.el.appendChild(el)
              numRendered++
            }
          })

          // fetch more if needed
          var remaining = amt - _msgs.length
          if (remaining > 0)
            return fetchBottomBy(remaining)
        }

        cb && cb(numRendered)
      })
    }
  }

  function doFetch (fetchopts, cb) {
    fetchopts.limit = fetchopts.limit || 30
    pull(opts.feed(fetchopts), pull.collect(function (err, _msgs) {
      cb(err, _msgs)

      if (opts.markread) {
        var ids = _msgs.map(function (m) { return m.key })
        app.ssb.phoenix.markRead(ids)
      }
    }))
  }

  // handlers

  if (opts.infinite) {
    var fetching = false
    window.onscroll = function (e) {
      if (fetching)
        return

      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
        // hit bottom
        fetching = true
        fetchBottom(function (err) {
          fetching = false
        })
      }
    }
  }

  // api

  feedContainer.fetchTop = fetchTop
  feedContainer.fetchBottom = fetchBottom

  return feedContainer
}

module.exports.makeStateObj = function () {
  return {
    msgs: [],
    topCursor: null,
    bottomCursor: null,
    el: null,
    lastScrollTop: 0
  } 
}
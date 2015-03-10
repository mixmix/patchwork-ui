'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

var mustRenderOpts = { mustRender: true }
module.exports = function (app, opts) {
  opts = opts || {}

  var feedState = opts.state
  var feedContainer = null
  if (!feedState)
    feedState = module.exports.makeStateObj()

  if (!opts.feed)
    opts.feed = app.ssb.createFeedStream
  if (!opts.cursor) {
    opts.cursor = function (msg) {
      if (msg)
        return [msg.value.timestamp, msg.value.author]
    }
  }
  if (!opts.renderMsg) {
    opts.renderMsg = function (msg) {
      return com.messageSummary(app, msg, mustRenderOpts)
    }
  }

  // markup
 
  if (!feedState.tbody)
    feedState.tbody = makeUnselectable(h('tbody'))
  else {
    // update message states
    var stateObj = { read: false }
    Array.prototype.forEach.call(feedState.tbody.querySelectorAll('tr'), function (el) {   
      var key = el.dataset.msg   
      if (!key) return   
      app.ssb.phoenix.isRead(key, function (err, read) {
        stateObj.read = !!read
        com.messageSummary.setRowState(el, stateObj)   
      })   
    })
  }

  feedContainer = h('.message-feed-container.full-height', h('table.message-feed', feedState.tbody))
  feedState.tbody.onclick = navtoMsg
  feedContainer.onscroll = onscroll

  // message fetch

  if (!feedState.msgs.length)
    fetchBack(30)

  function fetchFront (amt, cb) {
    var fetchopts = { reverse: false }
    fetchopts[(feedState.msgs.length == 0) ? 'gte' : 'gt'] = opts.cursor(feedState.frontCursor)
    var topmsgEl = feedState.tbody.children[0]

    doFetch(fetchopts, function (err, _msgs) {
      if (_msgs && _msgs.length) {
        // nothing new? stop
        if (feedState.frontCursor && feedState.frontCursor.key == _msgs[_msgs.length - 1].key)
          return (cb && cb())

        // advance cursors
        feedState.frontCursor = _msgs[_msgs.length - 1]
        if (!feedState.backCursor)
          feedState.backCursor = _msgs[0]

        // filter
        if (opts.filter)
          _msgs = _msgs.filter(opts.filter)

        // render
        var lastEl = feedState.tbody.firstChild
        _msgs.forEach(function (msg) {
          var el = opts.renderMsg(msg)
          el && feedState.tbody.insertBefore(el, lastEl)
        })

        // prepend
        feedState.msgs = _msgs.reverse().concat(feedState.msgs)

        // maintain scroll position
        if (topmsgEl)
          feedContainer.scrollTop = topmsgEl.offsetTop

        // fetch more if needed
        var remaining = amt - _msgs.length
        if (remaining > 0)
          return fetchFront(remaining, cb)
      }

      cb && cb()
    })
  }
  function fetchBack (amt, cb) {
    var fetchopts = { reverse: true }
    fetchopts[(feedState.msgs.length == 0) ? 'lte' : 'lt'] = opts.cursor(feedState.backCursor)
    
    doFetch(fetchopts, function (err, _msgs) {
      if (_msgs && _msgs.length) {
        // nothing new? stop
        if (feedState.backCursor && feedState.backCursor.key == _msgs[_msgs.length - 1].key)
          return (cb && cb())

        // advance cursors
        feedState.backCursor = _msgs[_msgs.length - 1]
        if (!feedState.frontCursor)
          feedState.frontCursor = _msgs[0]

        // filter
        if (opts.filter)
          _msgs = _msgs.filter(opts.filter)

        // append
        feedState.msgs = feedState.msgs.concat(_msgs)

        // render
        _msgs.forEach(function (msg) {
          var el = opts.renderMsg(msg)
          el && feedState.tbody.appendChild(el)
        })

        // fetch more if needed
        var remaining = amt - _msgs.length
        if (remaining > 0)
          return fetchBack(remaining, cb)
      }

      cb && cb()
    })
  }

  var fetching = false  
  function doFetch (fetchopts, cb) {
    if (fetching)
      return
    fetching = true
    fetchopts.limit = fetchopts.limit || 30
    pull(opts.feed(fetchopts), pull.collect(function (err, _msgs) {
      fetching = false
      cb(err, _msgs)
    }))
  }

  // handlers

  function navtoMsg (e) {
    // clicked on a row? abort if clicked on a sub-link
    var el = e.target
    while (el) {
      if (el.tagName == 'A' || el.tagName == 'TABLE') {
        return
      }
      if (el.tagName == 'TR')
        break
      el = el.parentNode
    }

    e.preventDefault()
    e.stopPropagation()
    var key = el.dataset.msg
    if (key)
      window.location.hash = '#/msg/'+key
  }

  function onscroll (e) {
    feedState.lastScrollTop = feedContainer.scrollTop
    if (fetching)
      return
    if (feedContainer.offsetHeight + feedContainer.scrollTop >= feedContainer.scrollHeight) {
      fetchBack(30)
    }
    else if (feedContainer.scrollTop <= 1) {
      fetchFront(30)
      feedContainer.scrollTop = 1
    }
  }

  return feedContainer
}

module.exports.makeStateObj = function () {
  return {
    msgs: [],
    frontCursor: null,
    backCursor: null,
    tbody: null,
    lastScrollTop: 0
  } 
}

function makeUnselectable (elem) {
  elem.onselectstart = function() { return false; };
  elem.style.MozUserSelect = "none";
  elem.style.KhtmlUserSelect = "none";
  elem.unselectable = "on";
  return elem
}
'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

var mustRenderOpts = { mustRender: true }
module.exports = function (app, filterFn, feedState) {

  var feedContainer = null
  if (!feedState)
    feedState = module.exports.makeStateObj()

  // markup

  function renderMsg (msg) {
    return com.messageSummary(app, msg, mustRenderOpts)
  }
 
  if (!feedState.tbody)
    feedState.tbody = makeUnselectable(h('tbody'))
  else {
    // update message states
    Array.prototype.forEach.call(feedState.tbody.querySelectorAll('tr'), function (el) {
      var key = el.dataset.msg
      if (!key) return
      app.accessTimesDb.get(key, function (err, ts) {
        com.messageSummary.setRowState(el, ts)
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
    var opts = { reverse: false }
    opts[(feedState.msgs.length == 0) ? 'gte' : 'gt'] = feedState.frontCursor
    var topmsgEl = feedState.tbody.children[0]

    doFetch(opts, function (err, _msgs) {
      if (_msgs && _msgs.length) {
        // nothing new? stop
        if (feedState.frontCursor && feedState.frontCursor.key == _msgs[_msgs.length - 1].key)
          return (cb && cb())

        // advance cursors
        feedState.frontCursor = _msgs[_msgs.length - 1]
        if (!feedState.backCursor)
          feedState.backCursor = _msgs[0]

        // filter
        if (filterFn)
          _msgs = _msgs.filter(filterFn)

        // render
        var lastEl = feedState.tbody.firstChild
        _msgs.forEach(function (msg) {
          var el = renderMsg(msg)
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
    var opts = { reverse: true }
    opts[(feedState.msgs.length == 0) ? 'lte' : 'lt'] = feedState.backCursor
    
    doFetch(opts, function (err, _msgs) {
      if (_msgs && _msgs.length) {
        // nothing new? stop
        if (feedState.backCursor && feedState.backCursor.key == _msgs[_msgs.length - 1].key)
          return (cb && cb())

        // advance cursors
        feedState.backCursor = _msgs[_msgs.length - 1]
        if (!feedState.frontCursor)
          feedState.frontCursor = _msgs[0]

        // filter
        if (filterFn)
          _msgs = _msgs.filter(filterFn)

        // append
        feedState.msgs = feedState.msgs.concat(_msgs)

        // render
        _msgs.forEach(function (msg) {
          var el = renderMsg(msg)
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
  function doFetch (opts, cb) {
    if (fetching)
      return
    fetching = true
    app.ssb.phoenix.getFeed(opts, function (err, _msgs) {
      fetching = false
      cb(err, _msgs)
    })
  }

  // handlers

  function navtoMsg (e) {
    // clicked on a row? abort if clicked on a sub-link
    var el = e.target
    while (el) {
      if (el.tagName == 'A' || el.tagName == 'TABLE') {
        if (el.classList.contains('read-toggle'))
          return onreadtoggle(e, el)
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
    else if (feedContainer.scrollTop === 0) {
      fetchFront(30)
    }
  }

  function onreadtoggle (e, btnEl) {
    e.preventDefault()

    var rowEl = btnEl
    while (rowEl && rowEl.tagName !== 'TR')
      rowEl = rowEl.parentNode

    var key = rowEl.dataset.msg
    app.accessTimesDb.get(key, function (er, accessTime) {
      if (accessTime) {
        app.accessTimesDb.del(key, function (err) {
          if (err) return console.error(err)
          com.messageSummary.setRowState(rowEl, 0)
        })
      } else {
        var _accessTime = Date.now()
        app.accessTimesDb.put(key, _accessTime, function (err) {
          if (err) return console.error(err)
          com.messageSummary.setRowState(rowEl, _accessTime)
        })
      }
    })
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
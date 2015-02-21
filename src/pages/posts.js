'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

var knownMsgs = {
  post: true,
  follow: true,
  trust: true,
  name: true,
  advert: true,
  init: true
}

var mustRenderOpts = { mustRender: true }
var msgs = []
var feedTBody, feedContainer
var frontCursor = null, backCursor = null
var lastScrollTop = 0
var lastQueryStr
module.exports = function (app) {

  var queryStr = app.page.qs.q || ''
  if (lastQueryStr != queryStr) {
    // new query, reset the feed
    msgs.length = 0
    frontCursor = backCursor = null
    feedTBody = feedContainer = null
    lastScrollTop = 0
  }

  function filterFn (msg) {
    var c = msg.value.content

    // :TODO: remove this
    // this filter strips out some really noisey messages
    // someday we'll have real ways to do this
    // for now, this is good
    if (c.type == 'sys-stat' || msg.value.author == 'V/M3/mKqB30EbEZuYFfond07vdf3rSoc8LhrI9X6yYs=.blake2s') // just...for now
      return false

    if (!queryStr)
      return true

    var author = app.names[msg.value.author] || msg.value.author
    var regex = new RegExp(queryStr.replace(/\s/g, '|'))
    if (regex.exec(author) || regex.exec(c.type))
      return true
    if ((c.type == 'post' || c.type == 'advert') && regex.exec(c.text))
      return true
    return false
  }

  // markup

  function renderMsg (msg, full) {
    mustRenderOpts.full = !!full
    return com.messageSummary(app, msg, mustRenderOpts)
  }
 
  var searchInput = h('input.search', { type: 'text', placeholder: 'Search', value: queryStr })
  if (!feedTBody) {
    feedTBody = makeUnselectable(h('tbody'))
    feedContainer = h('.message-feed-container', h('table.message-feed', feedTBody))
  }
  feedTBody.onclick = navtoMsg
  feedContainer.onscroll = onscroll
  app.setPage('posts', h('.row',
    h('.col-xs-1', com.sidenav(app)),
    h('.col-xs-9',
      // h('p#get-latest.hidden', h('button.btn.btn-primary.btn-block', { onclick: app.refreshPage }, 'Get Latest')),
      // 
      h('.message-feed-ctrls', h('form', { onsubmit: onsearch }, searchInput)),
      feedContainer
      //com.introhelp(app)
    ),
    h('.col-xs-2',
      com.adverts(app),
      h('hr'),
      com.sidehelp(app)
    )
  ))
  feedContainer.scrollTop = lastScrollTop

  // message fetch

  if (!msgs.length)
    fetchBack(30)

  function fetchFront (amt, cb) {
    var opts = { reverse: false }
    opts[(msgs.length == 0) ? 'gte' : 'gt'] = frontCursor
    var topmsgEl = feedTBody.children[0]

    doFetch(opts, function (err, _msgs) {
      if (_msgs && _msgs.length) {
        // nothing new? stop
        if (frontCursor && frontCursor.key == _msgs[_msgs.length - 1].key)
          return (cb && cb())

        // advance cursors
        frontCursor = _msgs[_msgs.length - 1]
        if (!backCursor)
          backCursor = _msgs[0]

        // filter
        if (filterFn)
          _msgs = _msgs.filter(filterFn)

        // render
        var lastEl = feedTBody.firstChild
        _msgs.forEach(function (msg) {
          var el = renderMsg(msg)
          el && feedTBody.insertBefore(el, lastEl)
        })

        // prepend
        msgs = _msgs.reverse().concat(msgs)

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
    opts[(msgs.length == 0) ? 'lte' : 'lt'] = backCursor
    
    doFetch(opts, function (err, _msgs) {
      if (_msgs && _msgs.length) {
        // nothing new? stop
        if (backCursor && backCursor.key == _msgs[_msgs.length - 1].key)
          return (cb && cb())

        // advance cursors
        backCursor = _msgs[_msgs.length - 1]
        if (!frontCursor)
          frontCursor = _msgs[0]

        // filter
        if (filterFn)
          _msgs = _msgs.filter(filterFn)

        // append
        msgs = msgs.concat(_msgs)

        // render
        _msgs.forEach(function (msg) {
          var el = renderMsg(msg)
          el && feedTBody.appendChild(el)
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
      if (el.tagName == 'A' || el.tagName == 'TABLE')
        return
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
    lastScrollTop = feedContainer.scrollTop
    if (fetching)
      return
    if (feedContainer.offsetHeight + feedContainer.scrollTop >= feedContainer.scrollHeight) {
      fetchBack(30)
    }
    else if (feedContainer.scrollTop === 0) {
      fetchFront(30)
    }
  }

  function onsearch (e) {
    e.preventDefault()
    window.location.hash = '#/posts?q='+encodeURIComponent(searchInput.value)
  }
}

function makeUnselectable (elem) {
  elem.onselectstart = function() { return false; };
  elem.style.MozUserSelect = "none";
  elem.style.KhtmlUserSelect = "none";
  elem.unselectable = "on";
  return elem
}
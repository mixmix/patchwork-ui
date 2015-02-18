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

function theFilterFn (msg) {
  var c = msg.value.content
  var l = mlib.getLinks(c, { tomsg: true })
  return (c.type in knownMsgs) && l.length === 0
}

var mustRenderOpts = { mustRender: true, full: true }
module.exports = function (app) {
  var filterFn = theFilterFn
  var msgs = []

  // markup

  function renderMsg (msg) {
    return com.messageSummary(app, msg, mustRenderOpts)
  }
 
  var feedTBody = makeUnselectable(h('tbody', { onclick: selectMsg, ondblclick: selectMsg }))
  var feedContainer = h('.message-feed-container', { onscroll: onscroll, onkeydown: onkeydown },
    h('table.message-feed',
      /*h('thead',
        h('tr',
          h('td'), h('td', 'item'), h('td', 'author'), h('td', 'age'))),*/
      feedTBody))
  app.setPage('posts', h('.row',
    h('.col-xs-2.col-md-1', com.sidenav(app)),
    h('.col-xs-10.col-md-11', 
      // h('p#get-latest.hidden', h('button.btn.btn-primary.btn-block', { onclick: app.refreshPage }, 'Get Latest')),
      // h('input.search', { type: 'text', placeholder: 'Search' }),
      feedContainer
      //com.introhelp(app)
    )
    // h('.col-xs-3.col-md-5',
      /*com.adverts(app),
      h('hr'),
      com.sidehelp(app)*/
    // )
  ))

  // message fetch

  var frontCursor = null, backCursor = null

  if (app.page.qs.start) {
    app.ssb.get(app.page.qs.start, function (err, msg) {
      if (err) {}// :TODO:
      else if (msg)
        backCursor = { key: app.page.qs.start, value: msg }
      fetchBack(30, fetchFront.bind(null, 30, doSelectMsg))
    })
  } else
    fetchBack(30, doSelectMsg)

  function fetchFront (amt, cb) {
    var opts = { reverse: false }
    opts[(msgs.length == 0) ? 'gte' : 'gt'] = frontCursor
    var topmsgEl = feedTBody.children[0]

    doFetch(opts, function (err, _msgs) {
      if (_msgs && _msgs.length) {
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
          if (el) {
            feedTBody.insertBefore(el, lastEl)
            lastEl = el
          }
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

  function selectMsg (e) {
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

    var msg = msgFor(el)
    if (e.type == 'dblclick')
      return window.open('#/msg/' + msg.key)
    doSelectMsg(el, msg)
  }

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
      window.location.hash = '#/posts?start='+encodeURIComponent(key)
  }

  function msgFor(el) {
    var key = el.dataset.msg
    for (var i =0; i < msgs.length; i++) {
      if (msgs[i].key === key)
        return msgs[i]
    }
    throw new Error('Failed to find message for selected row')
  }

  function doSelectMsg(el, msg) {
    if (!el)
      el = feedTBody.firstChild

    ;[].forEach.call(document.querySelectorAll('.preview'), function (el)  { el.parentNode.removeChild(el) })
    ;[].forEach.call(document.querySelectorAll('.selected'), function (el) { el.classList.remove('selected') })
    el.classList.toggle('selected')

    // scroll to msg if needed
    if (el.offsetTop < feedContainer.scrollTop || (el.offsetTop - feedContainer.scrollTop) > feedContainer.offsetHeight)
      feedContainer.scrollTop = el.offsetTop

    if (!msg)
      msg = msgFor(el)

    var inboundRelated = h('table.related')
    var td = h('td', com.messagePreview(app, msg), inboundRelated)
    td.setAttribute('colspan', 2)
    var previewContainer = h('tr.preview', h('td'), td)
    feedTBody.insertBefore(previewContainer, el.nextSibling)
    populateInboundRelatedTable(inboundRelated, app, msg)
  }

  function populateInboundRelatedTable(relatedTable, app, msg) {
    function add (msg, table) {
      var el = com.messageSummary(app, msg, { mustRender: true, full: true })
      el.onclick = navtoMsg
      table.appendChild(el)

      if (msg.related) {
        var subtable = h('table.related')
        var td = h('td', subtable)
        td.setAttribute('colspan', 2)
        table.appendChild(h('tr', h('td'), td))
        msg.related.forEach(function (submsg) {
          add(submsg, subtable)
        })
      }
    }
    app.ssb.relatedMessages({ id: msg.key }, function (err, msg) {
      (msg.related || []).forEach(function (submsg) {
        add(submsg, relatedTable)
      })
    })
  }

  // WARNING: GLOBAL SIDE EFFECT
  // TODO: find a way to catch this event without making global behavior changes
  // set the page's keydown behavior to scroll the message feed
  var UP = 38
  var DOWN = 40
  var ENTER = 13
  document.body.onkeydown = function (e) {
    var sel = document.querySelector('.selected')
    if (!sel)
      return

    if (e.ctrlKey || e.altKey)
      return

    var kc = e.charCode || e.keyCode
    kc = ({
      74: DOWN, //j
      75: UP //k
    })[kc] || kc

    if (kc == UP || kc == DOWN) {
      var n = (e.shiftKey) ? 5 : 1
      for (var i=0; i < n; i++) {
        if (kc === UP && sel.previousSibling) {
          sel = sel.previousSibling
          doSelectMsg(sel)
        }
        if (kc === DOWN && sel.nextSibling) {
          sel = sel.nextSibling
          doSelectMsg(sel)
        }
      }
      e.preventDefault()
    }
    if (kc === ENTER) {
      var msg = msgFor(sel)
      if (msg)
        window.open('#/msg/'+msg.key)
    }
  }

  function onscroll (e) {
    if (fetching)
      return
    if (feedContainer.offsetHeight + feedContainer.scrollTop >= feedContainer.scrollHeight) {
      fetchBack(30)
    }
    else if (feedContainer.scrollTop === 0) {
      fetchFront(30)
    }
  }
}

function makeUnselectable (elem) {
  elem.onselectstart = function() { return false; };
  elem.style.MozUserSelect = "none";
  elem.style.KhtmlUserSelect = "none";
  elem.unselectable = "on";
  return elem
}
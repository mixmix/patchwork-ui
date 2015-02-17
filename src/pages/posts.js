'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

var knownMsg = {
  post: true,
  follows: true,
  unfollows: true,
  trusts: true,
  names: true,
  advert: true,
  init: true
}

var mustRenderOpts = { mustRender: true, full: true }
module.exports = function (app) {
  var hideUnknown = false
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
  var previewContainer = h('div.message-preview-container')
  app.setPage('posts', h('.row',
    h('.col-xs-2.col-md-1', com.sidenav(app)),
    h('.col-xs-10.col-md-11', 
      // h('p#get-latest.hidden', h('button.btn.btn-primary.btn-block', { onclick: app.refreshPage }, 'Get Latest')),
      // h('input.search', { type: 'text', placeholder: 'Search' }),
      previewContainer,
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
      fetchBack(fetchFront)
    })
  } else
    fetchBack()

  function fetchFront (cb) {
    var opts = { reverse: false }
    opts[(msgs.length == 0) ? 'gte' : 'gt'] = frontCursor
    var topmsgEl = feedTBody.children[0]

    fetchMore(opts, function (err, _msgs) {
      // advance cursors
      frontCursor = _msgs[_msgs.length - 1]
      if (!backCursor)
        backCursor = _msgs[0]

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

      cb && cb()
    })
  }
  function fetchBack (cb) {
    var opts = { reverse: true }
    opts[(msgs.length == 0) ? 'lte' : 'lt'] = backCursor
    
    fetchMore(opts, function (err, _msgs) {
      // advance cursors
      backCursor = _msgs[_msgs.length - 1]
      if (!frontCursor)
        frontCursor = _msgs[0]

      // append
      msgs = msgs.concat(_msgs)

      // render
      _msgs.forEach(function (msg) {
        var el = renderMsg(msg)
        el && feedTBody.appendChild(el)
      })

      cb && cb()
    })
  }

  var fetching = false  
  function fetchMore (opts, cb) {
    if (fetching)
      return

    var wasEmpty = (msgs.length == 0)
    fetching = true
    app.ssb.phoenix.getFeed(opts, function (err, _msgs) {
      fetching = false
      if (_msgs && _msgs.length) {
        // filter
        _msgs = _msgs.filter(function (msg) {
          if (hideUnknown) {
            return knownMsg[msg.value.content.type]
          }
          return true
        })

        cb(err, _msgs)

        if (wasEmpty)
          doSelectMsg(feedTBody.firstChild, msgs[0])
      }
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
    var index = [].indexOf.call(feedTBody.children, el)
    var msg = msgs[index]
    if (!msg)
      throw new Error('Failed to find message for selected row')
    return msg
  }

  function doSelectMsg(el, msg) {
    ;[].forEach.call(document.querySelectorAll('.selected'), function (el) { el.classList.remove('selected') })
    el.classList.toggle('selected')

    // scroll to msg if needed
    if (el.offsetTop < feedContainer.scrollTop || (el.offsetTop - feedContainer.scrollTop) > feedContainer.offsetHeight)
      feedContainer.scrollTop = el.offsetTop

    if (!msg)
      msg = msgFor(el)

    // populate preview
    previewContainer.innerHTML = ''

    var outboundRelated = h('table.related')
    previewContainer.appendChild(outboundRelated)
    populateOutboundRelatedTable(outboundRelated, app, msg)

    previewContainer.appendChild(com.messagePreview(app, msg))

    var inboundRelated = h('table.related')
    previewContainer.appendChild(inboundRelated)
    populateInboundRelatedTable(inboundRelated, app, msg)
  }

  function populateOutboundRelatedTable(relatedTable, app, msg) {
    function add (msg, parent, depth) {
      var el = com.messageSummary(app, msg, { mustRender: true, full: true })
      el.onclick = navtoMsg
      el.children[1].style.borderLeftWidth = ''+((depth || 0) * 5) + 'px'
      relatedTable.insertBefore(el, parent)

      iterate(msg, el, depth + 1)
    }
    function iterate (msg, parent, depth) {
      mlib.getLinks(msg.value.content, { tomsg: true }).forEach(function (l) {
        app.ssb.get(l.msg, function (err, submsg) {
          if (submsg)
            add({ key: l.msg, value: submsg }, parent, depth)
        })
      })
    }
    iterate(msg, null, 1)
  }

  function populateInboundRelatedTable(relatedTable, app, msg) {
    function add (msg, depth) {
      var el = com.messageSummary(app, msg, { mustRender: true, full: true })
      el.onclick = navtoMsg
      el.children[1].style.borderRightWidth = ''+((depth || 0) * 5) + 'px'
      relatedTable.appendChild(el)

      if (msg.related) {
        msg.related.forEach(function (submsg) {
          add(submsg, depth + 1)
        })
      }
    }
    app.ssb.relatedMessages({ id: msg.key }, function (err, msg) {
      (msg.related || []).forEach(function (submsg) {
        add(submsg, 1)
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
      fetchBack()
    }
    else if (feedContainer.scrollTop === 0) {
      fetchFront()
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
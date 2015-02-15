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

var mustRenderOpts = { mustRender: true }
module.exports = function (app) {
  var done = multicb({ pluck: 1 })
  var opts = { /*start: +app.page.qs.start || 0,*/ reverse: true }
  var hideUnknown = false
  app.ssb.phoenix.getFeed(opts, done())
  done(function (err, res) {
    var msgs = res[0].filter(function (msg) {
      if (hideUnknown) {
        return knownMsg[msg.value.content.type]
      }
      return true
    })
    var cursor = msgs[msgs.length - 1]
    if (msgs.length < 30)
      fetchMore()

    // markup

    function renderMsg (msg) {
      return com.messageSummary(app, msg, mustRenderOpts)
    }
   
    var feedTBody = makeUnselectable(
      h('tbody',
        { onclick: selectMsg, ondblclick: selectMsg }, 
        msgs.map(renderMsg)))
    var feedContainer = h('.message-feed-container', { onscroll: onscroll, onkeydown: onkeydown },
      h('table.message-feed',
        h('thead',
          h('tr',
            h('td', 'item'), h('td', 'author'), h('td', 'age'))),
        feedTBody))
    var previewContainer = h('div.message-preview-container')
    app.setPage('posts', h('.row',
      h('.col-xs-2.col-md-1', com.sidenav(app)),
      h('.col-xs-10.col-md-11', 
        // h('p#get-latest.hidden', h('button.btn.btn-primary.btn-block', { onclick: app.refreshPage }, 'Get Latest')),
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
    doSelectMsg(feedTBody.firstChild, msgs[0])

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

      if (!msg)
        msg = msgFor(el)

      previewContainer.innerHTML = ''
      previewContainer.appendChild(com.messagePreview(app, msg))
      var referrers = h('table.referrers')
      previewContainer.appendChild(referrers)
      pull(app.ssb.messagesLinkedToMessage({ id: msg.key, keys: true }), pull.drain(function (msg2) {
        referrers.appendChild(com.messageSummary(app, msg2, { mustRender: true, full: true }))          
      }))
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

      if (e.ctrlKey || e.shiftKey || e.altKey)
        return

      var kc = e.charCode || e.keyCode
      kc = ({
        74: DOWN, //j
        75: UP //k
      })[kc] || kc

      if (kc == UP || kc == DOWN) {
        if (kc === UP && sel.previousSibling)
          doSelectMsg(sel.previousSibling)
        if (kc === DOWN && sel.nextSibling)
          doSelectMsg(sel.nextSibling)
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
        fetchMore()
      }
    }

    var fetching = false
    function fetchMore() {
      fetching = true
      app.ssb.phoenix.getFeed({ lt: cursor, reverse: true }, function (err, _msgs) {
        fetching = false
        if (_msgs && _msgs.length) {
          // advance cursor
          cursor = _msgs[_msgs.length - 1]

          // filter andmerge
          _msgs = _msgs.filter(function (msg) {
            if (hideUnknown) {
              return knownMsg[msg.value.content.type]
            }
            return true
          })
          msgs = msgs.concat(_msgs)

          // render
          _msgs.forEach(function (msg) {
            var el = renderMsg(msg)
            el && feedTBody.appendChild(el)
          })

          // try to fill the list
          if (msgs.length < 30) {
            fetchMore()
          }
        }
      })
    }      
  })
}

function makeUnselectable (elem) {
  elem.onselectstart = function() { return false; };
  elem.style.MozUserSelect = "none";
  elem.style.KhtmlUserSelect = "none";
  elem.unselectable = "on";
  return elem
}
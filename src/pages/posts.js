'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var com = require('../com')

var mustRenderOpts = { mustRender: true }
module.exports = function (app) {
  var done = multicb({ pluck: 1 })
  var opts = { /*start: +app.page.qs.start || 0,*/ reverse: true }
  app.ssb.phoenix.getPostCount(done())
  app.ssb.phoenix.getFeed(opts, done())
  done(function (err, res) {
    var msgcount = res[0]
    var msgs = res[1]

    // markup
   
    var feedTBody = makeUnselectable(
      h('tbody', { onclick: selectMsg, ondblclick: selectMsg }, 
        msgs.map(function (msg) { 
          if (msg.value) return com.messageSummary(app, msg, mustRenderOpts)
        })))
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

      // duplicated from doSelectMsg:
      // {
      var index = [].indexOf.call(feedTBody.children, el)
      var msg = msgs[index]
      if (!msg)
        throw new Error('Failed to find message for selected row')
      // }

      if (e.type == 'dblclick')
        return window.open('#/msg/' + msg.key)
      doSelectMsg(el, msg)
    }

    function doSelectMsg(el, msg) {
      ;[].forEach.call(document.querySelectorAll('.selected'), function (el) { el.classList.remove('selected') })
      el.classList.toggle('selected')

      if (!msg) {
        var index = [].indexOf.call(feedTBody.children, el)
        msg = msgs[index]
        if (!msg)
          throw new Error('Failed to find message for selected row')
      }

      previewContainer.innerHTML = ''
      previewContainer.appendChild(com.messagePreview(app, msg, { mustRender: true, fullLength: true, topmost: true }))      
    }

    // WARNING: GLOBAL SIDE EFFECT
    // set the page's keydown behavior to scroll the message feed
    var UP = 38
    var DOWN = 40
    document.body.onkeydown = function (e) {
      var kc = e.charCode || e.keyCode
      if (kc == UP || kc == DOWN) {
        var sel = document.querySelector('.selected')
        if (!sel)
          return
        if (kc === UP && sel.previousSibling)
          doSelectMsg(sel.previousSibling)
        if (kc === DOWN && sel.nextSibling)
          doSelectMsg(sel.nextSibling)
        e.preventDefault()
      }
    }

    var fetching = false
    function onscroll (e) {
      if (fetching)
        return
      if (feedContainer.offsetHeight + feedContainer.scrollTop >= feedContainer.scrollHeight) {
        fetching = true
        app.ssb.phoenix.getFeed({ lt: msgs[msgs.length - 1], reverse: true }, function (err, _msgs) {
          fetching = false
          if (_msgs && _msgs.length) {
            msgs = msgs.concat(_msgs)
            _msgs.forEach(function (msg) { 
              if (msg.value) feedTBody.appendChild(com.messageSummary(app, msg, mustRenderOpts))
            })
          }
        })
      }
    }      
  })
}

function makeUnselectable(elem) {
  elem.onselectstart = function() { return false; };
  elem.style.MozUserSelect = "none";
  elem.style.KhtmlUserSelect = "none";
  elem.unselectable = "on";
  return elem
}
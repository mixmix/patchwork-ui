'use strict'
var h = require('hyperscript')
var o = require('observable')
var com = require('../com')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var ssbref = require('ssb-ref')
var mlib = require('ssb-msgs')
var pull     = require('pull-stream')
var remote = require('remote')
var fs = remote.require('fs')
var dialog = remote.require('dialog')

module.exports = function () {
  var param = app.page.param
  var port = (ssbref.isLink(param)) ? 7777 : 7778
  var url = 'http://localhost:' + port + '/' + param

  // fetch any linked messages
  var msgs
  pull(
    app.ssb.links({ keys: true, values: true, dest: app.page.param }),
    pull.collect(function (err, _msgs) {
      msgs = _msgs||[]
      msgs.sort(function (a, b) {
        return b.value.timestamp - a.value.timestamp
      })
      commentFeed.appendChild(com.messageFeed({ 
        feed: function () { return pull.values(msgs) },
        onefetch: true
      }))
    })
  )

  // markup

  var commentFeed = h('div')
  var webview = com.webview({ url: url })
  ui.setPage('webview', h('.layout-grid',
    h('.layout-grid-col.webview-left', webview),
    (ssbref.isLink(param)) ?
      h('.layout-grid-col.webview-right.comments', { style: showhide(app.observ.commentsPanel) }, commentFeed) :
      ''
  ), { onPageTeardown: function () { window.removeEventListener('resize', resize) }})

  function showhide (input) {
    return { display: o.transform(input, function (v) { return (v) ? 'block' : 'none' }) }
  }

  // dynamically size various controls
  resize()
  window.addEventListener('resize', resize)
  function resize () {
    [
      [webview.querySelector('::shadow object'), 4],
      [document.querySelector('.webview-page .webview-left'), 2],
      [document.querySelector('.webview-page .comments'), 4]
    ].forEach(function (entry) {
      if (entry[0])
        entry[0].style.height = (window.innerHeight - 42 - entry[1]) + 'px'
    })
  }
}

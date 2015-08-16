var h = require('hyperscript')
var com = require('../com')
var app = require('../app')

exports.setup = function () {
  // dynamically size the subwindows to the full height of the page
  resize()
  window.addEventListener('resize', resize)
  function resize () {
    Array.prototype.forEach.call(document.querySelectorAll('.wm-content'), function (entry) {
      entry.style.height = (window.innerHeight - 38) + 'px'
    })
  }

  // listen for view changes
  app.observ.sidepaneView(exports.refreshSidepane)
}

exports.refreshNavs = function () {
  document.querySelector('#page .wm-nav').appendChild(com.nav.page())
  document.querySelector('#sidepane .wm-nav').appendChild(com.nav.sidepane())
}

exports.refreshSidepane = function (view) {
  // clear content
  var contentEl = document.querySelector('#sidepane .wm-content')
  contentEl.innerHTML = ''

  if (view) {
    document.querySelector('#sidepane').classList.remove('collapsed')

    // render content
    var feed = app.ssb.patchwork.createHomeStream
    if (view == 'inbox')
      feed = app.ssb.patchwork.createInboxStream
    else if (view == 'favs')
      feed = app.ssb.patchwork.createMyvoteStream
    contentEl.appendChild(com.messageFeed({ feed: feed, render: com.messageNav, limit: 10, infinite: true }))
  } else
    document.querySelector('#sidepane').classList.add('collapsed')
}
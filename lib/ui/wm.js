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
    var content
    if (view == 'inbox')
      content = com.messageFeed({ feed: app.ssb.patchwork.createInboxStream, render: com.messageNav, limit: 10, infinite: true })
    else if (view == 'favs')
      content = com.messageFeed({ feed: app.ssb.patchwork.createMyvoteStream, render: com.messageNav, limit: 10, infinite: true })
    else if (view == 'friends') {
      content = h('div', { style: 'background: #fff; padding: 0 25px' }, com.friendsHexagrid({ size: 80, nrow: 2 }))
    } else
      content = com.messageFeed({ feed: app.ssb.patchwork.createHomeStream, render: com.messageNav, limit: 10, infinite: true })
    contentEl.appendChild(content)
  } else
    document.querySelector('#sidepane').classList.add('collapsed')
}
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

  // add infinite scroll behaviors
  document.querySelector('#sidepane .wm-content').addEventListener('scroll', onSidepaneScroll)

  // listen for view changes
  app.observ.sidepaneView(exports.refreshSidepane)
}

// renders the navs
// - should only need to be called once during load
exports.refreshNavs = function () {
  document.querySelector('#page .wm-nav').appendChild(com.nav.page())
  document.querySelector('#sidepane .wm-nav').appendChild(com.nav.sidepane())
}

// renders the sidepane content
// - should be called by changes to app.observ.sidepaneView
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
      content = h('div',
        { style: 'background: #fafafa; padding: 0 25px; border-bottom: 1px solid #ccc' },
        com.friendsHexagrid({ size: 80, nrow: 2 })
      )
    } else
      content = com.messageFeed({ feed: app.ssb.patchwork.createHomeStream, render: com.messageNav, limit: 10, infinite: true })
    contentEl.appendChild(content)
  } else
    document.querySelector('#sidepane').classList.add('collapsed')
}

// infinite scroll behavior
function onSidepaneScroll (e) {
  var el = e.target
  if (el.scrollTop >= (el.scrollHeight - el.offsetHeight)) {
    // hit bottom
    var subel = el.querySelector('.infinite-scroll')
    if (subel)
      subel.fetchMore()
  }
}
var h = require('hyperscript')
var o = require('observable')
var ssbref = require('ssb-ref')
var com = require('./index')
var ui = require('../ui')
var modals = require('../ui/modals')
var subwindows = require('../ui/subwindows')
var app = require('../app')
var u = require('../util')

function addressbar () {
  
  // markup

  var addressInput = h('input', { value: '', onfocus: onfocus, onkeyup: onkeyup })

  // handlers

  function onfocus (e) {
    setTimeout(function () { // shameless setTimeout to wait for default behavior (preventDefault doesnt seem to stop it)
      addressInput.select() // select all on focus
    }, 50)
  }
  function onkeyup (e) {
    var v = addressInput.value
    if (e.keyCode == 13 && v) {
      if (v.charAt(0) == '@' && v.indexOf('.ed25519') !== -1)
        window.location.hash = '#/profile/'+v
      else if (ssbref.isBlobId(v))
        window.location.hash = '#/webview/'+v
      else if (ssbref.isMsgId(v))
        window.location.hash = '#/msg/'+v
      else
        window.location.hash = '#/search/'+v
    }
  }

  return [addressInput, h('.address-icon', com.icon('search'))]
}

exports.page = function () {

  // markup

  function unread (n) { return n ? h('span.unread.monospace', n) : ''}
  var homeNew       = o.transform(app.observ.newPosts, unread)
  var inboxUnread   = o.transform(app.observ.indexCounts.inboxUnread, unread)
  var votesUnread   = o.transform(app.observ.indexCounts.votesUnread, unread) 
  var followsUnread = o.transform(app.observ.indexCounts.followsUnread, unread)

  // dropdowns
  function onmenuclick (e) {
    e.preventDefault()
    e.stopPropagation()

    // toggle warning sign on network sync
    var syncWarningIcon
    if (app.observ.hasSyncIssue())
      syncWarningIcon = com.icon('warning-sign.text-danger')

    ui.dropdown(this, [
      h('a.item', { href: '#/profile/'+app.user.id, title: 'View your profile page' }, com.icon('user'), ' Your Profile'),
      h('a.item', { onclick: subwindows.pm, title: 'Compose an encrypted message' }, com.icon('envelope'), ' Secret Message'),
      h('hr'),
      h('a.item', { onclick: modals.invite, title: 'Connect to a public node using an invite code' }, com.icon('cloud'), ' Join a Public Node'),
      h('a.item.noicon', { href: 'https://github.com/ssbc/patchwork/issues/new', target: '_blank', title: 'File a suggestion or issue' }, com.icon('bullhorn'), ' File an Issue'),
      h('hr'),
      h('a.item', { href: '#/sync', title: 'Review the status of your mesh network connections' }, 'Network Sync ', syncWarningIcon),
      h('a.item', { href: '#/feed', title: 'View the raw data feed' }, 'Behind the Scenes')
    ], { right: true, offsetY: 5 })
  }

  function oncomments () {
    app.observ.commentsPanel(!app.observ.commentsPanel())
  }

  // toggle warning sign on network sync
  var syncWarning = o.transform(app.observ.hasSyncIssue, function (b) {
    if (!b) return
    return h('a', { href: '#/sync', title: 'Warning! You are not online' }, com.icon('warning-sign.text-danger'))
  })

  // render nav
  return h('.wm-nav-inner',
    h('a.button.home', { href: '#/', title: 'Home page feed' }, com.icon('home'), homeNew),
    h('a.button', { onclick: ui.navBack, title: 'Go back' }, com.icon('arrow-left')),
    h('a.button', { onclick: ui.navForward, title: 'Go forward' }, com.icon('arrow-right')),
    h('a.button', { onclick: ui.navRefresh, title: 'Refresh this page' }, com.icon('refresh')),
    addressbar(),
    (app.page.id == 'webview' && ssbref.isBlobId(app.page.param)) ? [
      h('a.comments', { onclick: oncomments, title: 'Toggle the comments panel' }, com.icon('comment')),
      h('.divider')
    ] : '',
    // h('a.stat', { href: '#/inbox', title: 'Your inbox' }, com.icon('inbox'), ' ', app.observ.indexCounts.inbox, inboxUnread),
    // h('a.stat', { href: '#/stars', title: 'Stars on your posts' }, com.icon('star'), ' ', app.observ.indexCounts.votes, votesUnread),
    // h('a.stat', { href: '#/friends', title: 'Your friends and other users' }, com.icon('user'), ' ', app.observ.indexCounts.follows, followsUnread),
    syncWarning,
    h('a.profile', { onclick: onmenuclick }, h('img', { src: com.profilePicUrl(app.user.id) }))
  )

  function item (id, path, label, extra_cls) {
    var selected = (id == app.page.id) ? '.selected' : ''
    return h('a.pagenav-'+id+(extra_cls||'')+selected, { href: '#/'+path }, label)
  }
}

exports.sidepane = function (opts) {
  function item (view, title, icon) {
    return o.transform(app.observ.sidepaneView, function (current) {
      return h('a.button'+(current==view?'.selected':''), { onclick: onnav(view), title: title }, com.icon(icon))
    })
  }
  function onnav (view) {
    return function (e) {
      e.preventDefault()
      if (view == app.observ.sidepaneView())
        app.observ.sidepaneView(false)
      else
        app.observ.sidepaneView(view)
    }
  }

  return h('.wm-nav-inner',
    item('home', 'Home Feed', 'list'),
    item('inbox', 'Inbox', 'inbox'),
    item('favs', 'Favorites', 'star'),
    item('friends', 'Friends', 'user'),
    o.transform(app.observ.sidepaneView, function (current) {
      var label = ({ home: 'Feed', inbox: 'Inbox', favs: 'Favorites', friends: 'Friends' })[current]
      return h('.view-label', label)
    })
  )
}
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
      if (ssbref.isFeedId(v))
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

exports.pagenav = function () {

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
      h('a.item.noicon', { href: 'https://github.com/ssbc/patchwork/issues/new', target: '_blank', title: 'File a suggestion or issue' }, com.icon('bullhorn'), ' Send Feedback'),
      h('a.item', { href: '#/help', title: 'Help page' }, com.icon('question-sign'), ' Help'),
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
  return h('.page-nav-inner',
    h('a.button.home', { href: '#/', title: 'Home page feed' }, com.icon('home'), homeNew),
    h('a.button', { onclick: ui.navBack, title: 'Go back' }, com.icon('arrow-left')),
    h('a.button', { onclick: ui.navForward, title: 'Go forward' }, com.icon('arrow-right')),
    h('a.button', { onclick: ui.navRefresh, title: 'Refresh this page' }, com.icon('refresh')),
    addressbar(),
    (app.page.id == 'webview' && ssbref.isBlobId(app.page.param)) ? [
      h('a.comments', { onclick: oncomments, title: 'Toggle the comments panel' }, com.icon('comment')),
      h('.divider')
    ] : '',
    h('a.stat', { href: '#/inbox', title: 'Your inbox' }, com.icon('envelope'), ' ', app.observ.indexCounts.inbox, inboxUnread),
    h('a.stat', { href: '#/stars', title: 'Stars on your posts' }, com.icon('star'), ' ', app.observ.indexCounts.votes, votesUnread),
    h('a.stat', { href: '#/friends', title: 'Your friends and other users' }, com.icon('user'), ' ', app.observ.indexCounts.follows, followsUnread),
    syncWarning,
    h('a.profile', { onclick: onmenuclick }, h('img', { src: com.profilePicUrl(app.user.id) }))
  )

  function item (id, path, label, extra_cls) {
    var selected = (id == app.page.id) ? '.selected' : ''
    return h('a.pagenav-'+id+(extra_cls||'')+selected, { href: '#/'+path }, label)
  }
}

exports.sidenav = function (opts) {
  function onviewclick (view) {
    return function (e) {
      e.preventDefault()
      app.homeMode.view = view
      ui.refreshPage()
    }
  }
  function view (view, label) {
    if (app.homeMode.view == view)
      return h('li.view', h('strong', h('a', { href: '#', onclick: onviewclick(view) }, label)))
    return h('li.view', h('a', { href: '#', onclick: onviewclick(view) }, label))
  }

  function onoptionsclick (e) {
    e.preventDefault()
    e.stopPropagation()
    function label(b, l) {
      return [com.icon(b ? 'check' : 'unchecked'), l]
    }
    ui.dropdown(e.target, [
      { value: 'live', label: label(app.homeMode.live, ' Livestream'), title: 'Show new updates to the feed in realtime' },
      { value: 'nsfw', label: label(app.filters.nsfw, ' NSFW Filter'), title: 'Show/hide posts flagged as NSFW by people you follow' },
      { value: 'spam', label: label(app.filters.spam, ' Spam Filter'), title: 'Show/hide posts flagged as Spam by people you follow' },
      { value: 'abuse', label: label(app.filters.abuse, ' Abuse Filter'), title: 'Show/hide posts flagged as Abuse by people you follow' }
    ], function (choice) {
      if (choice == 'live') {
        app.homeMode.live = !app.homeMode.live
        ui.refreshPage()
      } else {
        var hide = !app.filters[choice]
        app.filters[choice] = hide
        if (!hide)
          document.querySelector('.message-feed').classList.add('show-'+choice)
        else
          document.querySelector('.message-feed').classList.remove('show-'+choice)
      }
    })
  }

  return h('ul.list-unstyled.sidenav',
    h('li', h('h4', 'feed ', h('a', { href: '#', onclick: onoptionsclick, title: 'Options for this feed view', style: 'font-size: 12px; color: gray;' }, 'options'))),
    view('all', ['all', h('small', ' users on your network')]),
    view('friends', ['friends', h('small', ' that you have followed')]),
    o.transform(app.observ.peers, function (peers) {
      // :HACK: hyperscript needs us to return an Element if it's going to render
      // we really shouldnt be returning a div here, but it does render correctly
      // would be better to update hyperscript to correctly handle an array
      return h('div', peers
        .sort(function (a, b) {
          if (!a.announcers) return -1
          if (!b.announcers) return 1
          return (a.announcers.length - b.announcers.length)
        })
        .map(function (peer) {
          if (!peer.time || !peer.time.connect) return
          return view(peer.key, [peer.host, h('small', ' members')])
        })
        .filter(Boolean)
      )
    }),
    h('li', h('br')),
    h('li', h('h4', 'follows and flags'))
  )
}
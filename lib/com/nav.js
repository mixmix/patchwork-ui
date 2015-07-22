var h = require('hyperscript')
var o = require('observable')
var isref = require('ssb-ref')
var com = require('./index')
var ui = require('../ui')
var modals = require('../ui/modals')
var subwindows = require('../ui/subwindows')
var app = require('../app')
var u = require('../util')

function addressbar () {
  // hardcoded address (for now)
  var location = app.page.id
  if (location == 'profile' || location == 'webview' || location == 'search')
    location = app.page.param

  // markup

  var addressInput = h('input', { value: location, onfocus: onfocus, onkeyup: onkeyup })

  // handlers

  function onfocus (e) {
    setTimeout(function () { // shameless setTimeout to wait for default behavior (preventDefault doesnt seem to stop it)
      addressInput.select() // select all on focus
    }, 50)
  }
  function onkeyup (e) {
    var v = addressInput.value
    if (e.keyCode == 13 && v) {
      if (isref(v) && v.indexOf('ed25519') > 0)
        window.location.hash = '#/profile/'+v
      else if (isref(v) || v.indexOf('/') === 0)
        window.location.hash = '#/webview/'+v
      else
        window.location.hash = '#/search/'+v
    }
  }

  return addressInput
}

exports.pagenav = function () {

  // markup

  function unread (n) { return n ? h('span.unread.monospace', n) : ''}
  var inboxUnread   = o.transform(app.observ.indexCounts.inboxUnread, unread)
  var votesUnread   = o.transform(app.observ.indexCounts.votesUnread, unread) 
  var followsUnread = o.transform(app.observ.indexCounts.followsUnread, unread)

  // dropdowns
  function onmenuclick (e) {
    e.preventDefault()
    e.stopPropagation()

    // toggle warning sign on network sync
    var syncWarningIcon
    var stats = u.getPubStats()
    if (!stats.membersof || !stats.active)
      syncWarningIcon = com.icon('warning-sign.text-danger')

    ui.dropdown(this, [
      h('a.item', { href: '#/profile/'+app.user.id }, com.icon('user'), ' Your Profile'),
      h('a.item', { onclick: subwindows.pm }, com.icon('envelope'), ' Secret Message'),
      h('hr'),
      h('a.item', { onclick: modals.lookup }, com.icon('search'), ' Find a Friend'),
      h('a.item', { onclick: modals.invite }, com.icon('cloud'), ' Join a Pub'),
      h('a.item', { onclick: modals.getLookup }, 'Your Lookup Code'),
      h('hr'),
      h('a.item', { href: '#/sync' }, syncWarningIcon, ' Network Sync'),
      h('a.item', { href: '#/feed' }, 'Behind the Scenes')      
    ], { right: true, offsetY: 5 })
  }

  function oncomments () {
    app.observ.commentsPanel(!app.observ.commentsPanel())
  }
  function oneditor () {
    app.observ.editorPanel(!app.observ.editorPanel())
  }
  function togglecls (s) {
    return o.transform(app.observ[s+'Panel'], function (v) {
      return 'stat '+s+(v?' selected':'')
    })
  }

  // render nav
  return h('.page-nav-inner',
    h('a.button.home', { href: '#/' }, o.transform(app.observ.newPosts, function (n) { return (n) ? h('span.unread', n) : com.icon('home') })),
    h('a.button', { onclick: ui.navBack }, com.icon('arrow-left')),
    h('a.button', { onclick: ui.navForward }, com.icon('arrow-right')),
    h('a.button', { onclick: ui.navRefresh }, com.icon('refresh')),
    addressbar(),
    (app.page.id == 'webview') ? [
      (isref.isHash(app.page.param)) ? h('a', { onclick: oncomments, className: togglecls('comments') }, com.icon('comment')) : '',
      h('a', { onclick: oneditor, className: togglecls('editor') }, com.icon('edit')),
      h('.divider')
    ] : '',
    h('a.stat', { href: '#/inbox' }, com.icon('envelope'), ' ', app.observ.indexCounts.inbox, inboxUnread),
    h('a.stat', { href: '#/stars' }, com.icon('star'), ' ', app.observ.indexCounts.votes, votesUnread),
    h('a.stat', { href: '#/friends' }, com.icon('user'), ' ', app.observ.indexCounts.follows, followsUnread),
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
      { value: 'live', label: label(app.homeMode.live, ' Livestream') },
      { value: 'nsfw', label: label(app.filters.nsfw, ' NSFW Filter') },
      { value: 'spam', label: label(app.filters.spam, ' Spam Filter') },
      { value: 'abuse', label: label(app.filters.abuse, ' Abuse Filter') }
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
    h('li', h('a.btn.btn-3d', { onclick: modals.lookup }, com.icon('search'), ' Find a Friend')),
    h('li', h('a.btn.btn-3d', { onclick: modals.invite }, com.icon('cloud'), ' Join a Pub')),
    h('li', h('span', {style:'display: inline-block; padding: 4px 12px 2px'}, h('a', { href: '#', onclick: onoptionsclick }, com.icon('cog'), 'Options'))),
    h('li', h('span', {style:'display: inline-block; padding: 4px 12px 2px'}, h('a', { href: 'https://github.com/ssbc', target: '_blank' }, com.icon('bullhorn'), 'Send Feedback'))),
    h('li', h('span', {style:'display: inline-block; padding: 0 12px 6px'}, com.a('#/help', [com.icon('question-sign'), 'Help']))),
    h('li', h('hr')),
    h('li', h('h4', 'filter')),
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
    h('li', h('hr')),
    h('li', h('h4', 'follows and flags'))
  )
}
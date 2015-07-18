var h = require('hyperscript')
var o = require('observable')
var suggestBox = require('suggest-box')
var com = require('./index')
var ui = require('../ui')
var modals = require('../ui/modals')
var subwindows = require('../ui/subwindows')
var app = require('../app')
var u = require('../util')

exports.pagenav = function () {

  // markup

  function unread (n) { return n ? h('span.unread.monospace', n) : ''}
  var inboxUnread   = o.transform(app.observ.indexCounts.inboxUnread, unread)
  var votesUnread   = o.transform(app.observ.indexCounts.votesUnread, unread) 
  var followsUnread = o.transform(app.observ.indexCounts.followsUnread, unread)

  // hardcoded address (for now)
  var location = app.page.id
  if (location == 'profile') {
    var name = app.users.names[app.page.param]
    if (name)
      location = name + '\'s profile'
    else
      location = app.page.param
  }
  var addressInput = h('input', { value: location, onfocus: onfocus, onkeyup: onkeyup, onsuggestselect: onselect })
  suggestBox(addressInput, { any: app.suggestOptions['@'] }, { cls: 'msg-recipients' })

  function onfocus (e) {
    setTimeout(function () { // shameless setTimeout to wait for default behavior (preventDefault doesnt seem to stop it)
      addressInput.select() // select all on focus
    }, 50)
  }
  function onkeyup (e) {
    if (e.keyCode == 13) {
      if (addressInput.value)
        window.location.hash = '#/'+addressInput.value
    }
  }
  function onselect (e) {
    window.location.hash = '#/profile/' + e.detail.id
  }

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
      h('a.item', { href: '#/profile/'+app.user.id }, 'Your Profile'),
      h('a.item', { href: '#', onclick: modals.getLookup }, 'Your Lookup Code'),
      h('hr'),
      h('a.item', { href: '#', onclick: function () { e.preventDefault(); subwindows.pm() } }, h('span', { style: 'margin-right: 5px' }, com.icon('envelope')), 'Secret Message'),
      h('hr'),
      h('a.item', { href: '#/sync' }, syncWarningIcon, ' Network Sync'),
      h('a.item', { href: '#/feed' }, 'Under the Hood')      
    ], { right: true, offsetY: 5 })
  }

  // render nav
  return h('.page-nav-inner',
    h('a.button.home', { href: '#/' }, o.transform(app.observ.newPosts, function (n) { return (n) ? h('span.unread', n) : com.icon('home') })),
    h('a.button', { href: '#', onclick: ui.navBack }, com.icon('arrow-left')),
    h('a.button', { href: '#', onclick: ui.navForward }, com.icon('arrow-right')),
    h('a.button', { href: '#', onclick: ui.navRefresh }, com.icon('refresh')),
    addressInput,
    h('a.stat', { href: '#/inbox' }, com.icon('envelope'), ' ', app.observ.indexCounts.inbox, inboxUnread),
    h('a.stat', { href: '#/stars' }, com.icon('star'), ' ', app.observ.indexCounts.votes, votesUnread),
    h('a.stat', { href: '#/friends' }, com.icon('user'), ' ', app.observ.indexCounts.follows, followsUnread),
    h('a.profile', { href: '#', onclick: onmenuclick }, h('img', { src: com.profilePicUrl(app.user.id) }))
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
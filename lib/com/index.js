'use strict'
var h = require('hyperscript')
var o = require('observable')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var subwindows = require('../ui/subwindows')
var u = require('../util')
var social = require('../social-graph')
var suggestBox = require('suggest-box')
var ago = require('nicedate')

var a =
exports.a = function (href, text, opts) {
  opts = opts || {}
  opts.href = href
  return h('a', opts, text)
}

var icon =
exports.icon = function (i) {
  return h('span.glyphicon.glyphicon-'+i)
}

var userlink =
exports.userlink = function (id, text, opts) {
  opts = opts || {}
  opts.className = (opts.className || '') + ' user-link'
  text = text || u.shortString(id)
  return h('span.user-link-outer', hovercard(id), a('#/profile/'+id, text, opts))
}

var user =
exports.user = function (id, opts) {
  var followIcon
  if (id != app.user.id && (!app.user.profile.assignedTo[id] || !app.user.profile.assignedTo[id].following)) {
    followIcon = [' ', h('a', 
      { title: 'This is not somebody you follow.', href: '#/profile/'+id },
      h('span.text-muted', icon('question-sign'))
    )]
  }

  var l = userlink
  if (opts && opts.thin)
    l = userlinkThin

  var name = userName(id)
  if (opts && opts.maxlength && name.length > opts.maxlength)
    name = name.slice(0, opts.maxlength-3) + '...'

  return [l(id, name), followIcon]
}

var userName =
exports.userName = function (id) {
  return app.users.names[id] || u.shortString(id)
}

var profilePicUrl =
exports.profilePicUrl = function (id) {
  var url = './img/default-prof-pic.png'
  var profile = app.users.profiles[id]
  if (profile) {
    var link

    // lookup the image link
    if (profile.assignedBy[app.user.id] && profile.assignedBy[app.user.id].profilePic)
      link = profile.assignedBy[app.user.id].profilePic
    else if (profile.self.profilePic)
      link = profile.self.profilePic

    if (link) {
      url = 'blob:'+link.ext

      // append the 'backup img' flag, so we always have an image
      url += '?fallback=img'

      // if we know the filetype, try to construct a good filename
      if (link.type) {
        var ext = link.type.split('/')[1]
        if (ext) {
          var name = app.users.names[id] || 'profile'
          url += '&name='+encodeURIComponent(name+'.'+ext)
        }
      }
    }
  }
  return url
}

var userImg =
exports.userImg = function (id) {
  return h('a.user-img', { href: '#/profile/'+id, title: userName(id) },
    hovercard(id),
    h('img', { src: profilePicUrl(id) }))
}

var userlinkThin =
exports.userlinkThin = function (id, text, opts) {
  opts = opts || {}
  opts.className = (opts.className || '') + 'thin'
  return userlink(id, text, opts)
}

var hexagon =
exports.hexagon = function (url, size) {
  var img = url ? 'url('+url+')' : 'none'
  size = size || 30
  return h('.hexagon-'+size, { 'data-bg': url, style: 'background-image: '+img },
    h('.hexTop'),
    h('.hexBottom'))
}

var userHexagon =
exports.userHexagon = function (id, size) {
  return h('a.user-hexagon', { href: '#/profile/'+id },
    hovercard(id),
    hexagon(profilePicUrl(id), size)
  )
}

var userRelationship =
exports.userRelationship = function (id, nfollowers, nflaggers) {
  // gather followers that you follow
  if (typeof nfollowers == 'undefined')
    nfollowers = social.followedFollowers(app.user.id, id).length
  var followersSummary
  if (nfollowers === 0)
    followersSummary = 'Not followed by anyone you follow'
  else
    followersSummary = 'Followed by ' + nfollowers + ' user' + (nfollowers==1?'':'s') + ' you follow'

  // gather flaggers that you follow (and self)
  if (typeof nflaggers == 'undefined')
    nflaggers = social.followedFlaggers(app.user.id, id, true).length
  var flaggersSummary
  if (nflaggers !== 0) {
    flaggersSummary = h('span.text-danger',
      { style: 'margin-left: 10px' },
      icon('flag'), ' Flagged by ', nflaggers, ' user' + (nflaggers==1?'':'s')
    )
  }

  return h('p', followersSummary, flaggersSummary)
}

var hovercard =
exports.hovercard = function (id) {
  var name = userName(id)
  var following = social.follows(app.user.id, id)
  return h('.hovercard', { style: 'background-image: url('+profilePicUrl(id)+')' },
    h('h3', userName(id)),
    userRelationship(id),
    h('p', following ? 'You follow ' : 'You do not follow ', name)
  )
}

var userHexagrid =
exports.userHexagrid = function (uids, opts) {
  var nrow = (opts && opts.nrow) ? opts.nrow : 3
  var size = (opts && opts.size) ? opts.size : 60

  var els = [], row = []
  uids.forEach(function (uid) {
    row.push(userHexagon(uid, size))
    if (row.length >= nrow) {
      els.push(h('div', row))
      row = []
    }
  })
  if (row.length)
    els.push(h('div', row))
  return h('.user-hexagrid-'+size, els)
}

var friendsHexagrid =
exports.friendsHexagrid = function (opts) {
  var friends = []
  friends.push(app.user.id)
  for (var k in app.users.profiles) {
    var p = app.users.profiles[k]
    if (opts && opts.reverse) {
      if (p.assignedTo[app.user.id] && p.assignedTo[app.user.id].following)
        friends.push(p.id)
    } else {
      if (p.assignedBy[app.user.id] && p.assignedBy[app.user.id].following)
        friends.push(p.id)
    }
  }
  if (friends.length)
    return userHexagrid(friends, opts)
}

exports.filterClasses = function () {
  var cls = ''
  if (!app.filters.nsfw)
    cls += '.show-nsfw'
  if (!app.filters.spam)
    cls += '.show-spam'
  if (!app.filters.abuse)
    cls += '.show-abuse'
  return cls
}

var nav =
exports.nav = function (opts) {
  var items = opts.items.map(function (item) {
    var cls = '.navlink-'+item[0]
    if (item[0] == opts.current)
      cls += '.selected'
    if (item[3])
      cls += item[3]
    if (typeof item[1] == 'function')
      return h('a'+cls, { href: '#', 'data-item': item[0], onclick: item[1] }, item[2])
    return h('a'+cls, { href: item[1] }, item[2])
  })
  return h('.navlinks', items)
}

var search =
exports.search = function (opts) {
  var searchInput = h('input.search', { type: 'text', name: 'search', placeholder: 'Search', value: opts.value })
  return h('form', { onsubmit: opts.onsearch }, searchInput)
}

var pagenav =
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

  var syncWarningIcon = icon('warning-sign.text-danger.hide')
  var dropdown = h('.dropdown',
    h('a', { href: '#/profile/'+app.user.id }, 'Your Profile'),
    h('a', { href: '#', onclick: modals.getLookup }, 'Your Lookup Code'),
    h('hr'),
    h('a', { href: '#/sync' }, syncWarningIcon, ' Network Sync'),
    h('a', { href: '#/feed' }, 'Under the Hood')
  )
  function ondropdown (e) {
    if (e.target.classList.contains('dropdown') || e.target.tagName == 'IMG') {
      e.preventDefault()

      // toggle warning sign on network sync
      var stats = u.getPubStats()
      if (!stats.membersof || !stats.active)
        syncWarningIcon.classList.remove('hide')
      else
        syncWarningIcon.classList.add('hide')

      dropdown.classList.add('show')
    }
  }
  function ondropup (e) {
    dropdown.classList.remove('show')    
  }

  // render nav
  return h('.page-nav-inner',
    h('a.button.home', { href: '#/' }, o.transform(app.observ.newPosts, function (n) { return (n) ? h('span.unread', n) : icon('home') })),
    h('a.button', { href: '#', onclick: ui.navBack }, icon('arrow-left')),
    h('a.button', { href: '#', onclick: ui.navForward }, icon('arrow-right')),
    h('a.button', { href: '#', onclick: ui.navRefresh }, icon('refresh')),
    h('.divider'),
    addressInput,
    h('.divider'),
    h('a.action', { href: '#', onclick: subwindows.pm }, 'Compose'),
    h('a.stat', { href: '#/inbox' }, icon('envelope'), ' ', app.observ.indexCounts.inbox, inboxUnread),
    h('a.stat', { href: '#/stars' }, icon('star'), ' ', app.observ.indexCounts.votes, votesUnread),
    h('a.stat', { href: '#/friends' }, icon('user'), ' ', app.observ.indexCounts.follows, followsUnread),
    h('a.profile', { href: '#', onclick: ondropdown, onmouseleave: ondropup },
      h('img', { src: profilePicUrl(app.user.id), title: 'Your Profile' }),
      dropdown
    )
  )

  function item (id, path, label, extra_cls) {
    var selected = (id == app.page.id) ? '.selected' : ''
    return h('a.pagenav-'+id+(extra_cls||'')+selected, { href: '#/'+path }, label)
  }
}

var sidenav =
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
    function label(b, l) {
      return [icon(b ? 'check' : 'unchecked'), l]
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
    h('li', h('a.btn.btn-3d', { onclick: modals.lookup }, icon('search'), ' Find a Friend')),
    h('li', h('a.btn.btn-3d', { onclick: modals.invite }, icon('cloud'), ' Join a Pub')),
    h('li', h('span', {style:'display: inline-block; padding: 4px 12px 2px'}, h('a', { href: '#', onclick: onoptionsclick }, icon('cog'), 'Options'))),
    h('li', h('span', {style:'display: inline-block; padding: 4px 12px 2px'}, h('a', { href: 'https://github.com/ssbc', target: '_blank' }, icon('bullhorn'), 'Send Feedback'))),
    h('li', h('span', {style:'display: inline-block; padding: 0 12px 6px'}, a('#/help', [icon('question-sign'), 'Help']))),
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

var welcomehelp =
exports.welcomehelp = function () {
  return h('.message',
    h('span.user-img', h('img', { src: profilePicUrl(false) })),
    h('ul.message-header.list-inline', h('li', h('strong', 'Scuttlebot'))),
    h('.message-body',
      h('.markdown',
        h('h3', 'Hello! And welcome to ', h('strong', 'Patchwork.')),
        h('p', 
          'Patchwork is an independent network of servers and users. ',
          'The software is Free and Open-source, and the data is stored on YOUR computer.'
        ),
        h('p', 'Let\'s get you started!')
      )
    ),
    h('.message-comments',
      h('.comment',
        h('span.user-img', h('img', { src: profilePicUrl(false) })),
        h('.comment-inner',
          h('.markdown',
            h('h4', 'Step 1: Join a Pub Server'),
            h('p', 'To reach across the Internet, you need to belong to a ', h('strong', 'Pub Server'), '. '),
            h('.text-center', { style: 'padding: 7px; background: rgb(238, 238, 238); margin-bottom: 10px; border-radius: 5px;' },
              h('a.btn.btn-3d', { href: '#', onclick: modals.invite }, icon('cloud'), ' Join a Pub')
            )
          )
        )
      ),
      h('.comment',
        h('span.user-img', h('img', { src: profilePicUrl(false) })),
        h('.comment-inner',
          h('.markdown',
            h('h4', 'Step 2: Find your Friends'),
            h('p', 'Have your friends give you ', h('strong', 'Lookup Codes'), ' so you can follow them.'),
            h('.text-center', { style: 'padding: 7px; background: rgb(238, 238, 238); margin-bottom: 10px; border-radius: 5px;' },
              h('a.btn.btn-3d', { href: '#', onclick: modals.lookup }, icon('search'), ' Find a Friend')
            )
          )
        )
      )
    )
  )
}

exports.paginator = function (base, start, count) {
  var prevBtn = h('a.btn.btn-primary', { href: base+((start - 30 > 0) ? start - 30 : 0) }, icon('chevron-left'))
  var nextBtn = h('a.btn.btn-primary', { href: base+(start+30) }, icon('chevron-right'))
  if (start <= 0) prevBtn.setAttribute('disabled', true)    
  if (start+30 > count) nextBtn.setAttribute('disabled', true)
  return h('p', prevBtn, (start + 1), ' - ', Math.min(count, (start + 30)), ' ('+count+')', nextBtn)
}

var panel =
exports.panel = function (title, content) {
  return h('.panel.panel-default', [
    (title) ? h('.panel-heading', h('h3.panel-title', title)) : '',
    h('.panel-body', content)
  ])
}

var page =
exports.page = function (id, content) {
  return h('#page.container-fluid.'+id+'-page', content)
}

exports.prettyRaw = require('./pretty-raw')
exports.messageFeed = require('./message-feed')
exports.message = require('./message')
exports.messageThread = require('./message-thread')
exports.messageSummary = require('./message-summary')
exports.messageOneline = require('./message-oneline')
exports.messageAttachments = require('./message-attachments')
exports.messageStats = require('./message-stats')
exports.contactFeed = require('./contact-feed')
exports.contactPlaque = require('./contact-plaque')
exports.contactListing = require('./contact-listing')
exports.notifications = require('./notifications')
exports.peers = require('./peers')
exports.postForm = require('./post-form')
exports.pmForm = require('./pm-form')
exports.composer = require('./composer')
exports.imageUploader = require('./image-uploader')
exports.inviteForm = require('./invite-form')
exports.lookupForm = require('./lookup-form')
exports.renameForm = require('./rename-form')
exports.flagForm = require('./flag-form')
exports.networkGraph = require('./network-graph')
exports.connectionGraph = require('./connection-graph')
'use strict'
var h = require('hyperscript')
var baseEmoji = require('base-emoji')
var u = require('../lib/util')
var schemas = require('ssb-msg-schemas')

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
  return h('span', a('#/profile/'+id, text, opts))
}

var user =
exports.user = function (app, id) {
  var followIcon
  if (id != app.user.id && (!app.user.profile.assignedTo[id] || !app.user.profile.assignedTo[id].following)) {
    followIcon = [' ', h('a', 
      { title: 'This is not somebody you follow.', href: '#/profile/'+id },
      h('span.text-muted', icon('question-sign'))
    )]
  }

  return [userlink(id, userName(app, id)), followIcon]
}

var userName =
exports.userName = function (app, id) {
  return app.users.names[id] || u.shortString(id)
}

var profilePicUrl =
exports.profilePicUrl = function (app, id) {
  var url = '/img/default-prof-pic.png'
  var profile = app.users.profiles[id]
  if (profile) {
    var link

    // lookup the image link
    if (profile.assignedBy[app.user.id] && profile.assignedBy[app.user.id].profilePic)
      link = profile.assignedBy[app.user.id].profilePic
    else if (profile.self.profilePic)
      link = profile.self.profilePic

    if (link) {
      // construct base url
      url = '/ext/' + link.ext

      // if we know the filetype, try to construct a good filename
      if (link.type) {
        var ext = link.type.split('/')[1]
        if (ext) {
          var name = app.users.names[id] || 'profile'
          url += '/'+name+'.'+ext
        }
      }

      // append the 'backup img' flag, so we always have an image
      url += '?bimg'
    }
  }
  return url
}

var userImg =
exports.userImg = function (app, id) {
  return h('a.user-img', { href: '#/profile/'+id, title: userName(app, id) },
    // h('.hovercard', '// ', user(app, id), ' ¬'),
    h('img', { src: profilePicUrl(app, id) }))
}

var userlinkThin =
exports.userlinkThin = function (id, text, opts) {
  opts = opts || {}
  opts.className = (opts.className || '') + 'thin'
  return userlink(id, text, opts)
}

var hexagon =
exports.hexagon = function (img, size) {
  img = img ? 'url('+img+')' : 'none'
  size = size || 30
  return h('.hexagon-'+size, { style: 'background-image: '+img },
    h('.hexTop'),
    h('.hexBottom'))
}

var userHexagon =
exports.userHexagon = function (app, id, size) {
  return h('a.user-hexagon', { href: '#/profile/'+id },
    h('.hovercard', '// ', user(app, id), ' ¬'),
    hexagon(profilePicUrl(app, id), size))
}

var userHexagrid =
exports.userHexagrid = function (app, uids, opts) {
  var nrow = (opts && opts.nrow) ? opts.nrow : 3
  var size = (opts && opts.size) ? opts.size : 60

  var els = [], row = []
  uids.forEach(function (uid) {
    row.push(userHexagon(app, uid, size))
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
exports.friendsHexagrid = function (app, opts) {
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
    return userHexagrid(app, friends, opts)
}

var toEmoji =
exports.toEmoji = function (buf, size) {
  size = size || 20
  if (!buf)
    return ''
  if (typeof buf == 'string')
    buf = new Buffer(buf.slice(0, buf.indexOf('.')), 'base64')
  return baseEmoji.toCustom(buf, function(v, emoji) {
    return '<img class="emoji" width="'+size+'" height="'+size+'" src="/img/emoji/'+emoji.name+'.png" alt=":'+emoji.name+':" title="'+emoji.name+'"> '+emoji.name.replace(/_/g, ' ')+'<br>'
  })
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
exports.pagenav = function (app) {

  // markup

  var upvotesUnread = (app.ui.indexCounts.upvotesUnread) ? h('span.unread.monospace', '+', app.ui.indexCounts.upvotesUnread) : ''
  var followsUnread = (app.ui.indexCounts.followsUnread) ? h('span.unread.monospace', '+', app.ui.indexCounts.followsUnread) : ''
  var inboxUnread   = (app.ui.indexCounts.inboxUnread)   ? h('span.unread.monospace', '+', app.ui.indexCounts.inboxUnread) : ''

  // render nav
  return h('.page-nav-inner',
    item('home', '', ['Scuttlebutt'], '.title'),
    item('address-book', 'address-book', '+ Add friends', '.thin'),
    h('.spacer'),
    item('compose', 'compose', 'Private Message', '.action'),
    item('inbox',        'inbox',        [icon('envelope'), ' ', app.ui.indexCounts.inbox,   inboxUnread],   '.thin.notification'),
    item('stars',        'stars',        [icon('star'),     ' ', app.ui.indexCounts.upvotes, upvotesUnread], '.thin.notification'),
    item('friends',      'friends',      [icon('user'),     ' ', app.ui.indexCounts.follows, followsUnread], '.thin.notification'),
    item('me',           'profile/'+app.user.id, h('img', { src: profilePicUrl(app, app.user.id) }), '.nopad')
  )

  function item (id, path, label, extra_cls) {
    var selected = (id == app.page.id) ? '.selected' : ''
    return h('a.pagenav-'+id+(extra_cls||'')+selected, { href: '#/'+path }, label)
  }
}

var sidenav =
exports.sidenav = function (app) {
  var pages = [
    ['post',   [icon('comment'), ' New Status']]
    // ['photos', [icon('picture'), ' New Album']],
    // ['event',  [icon('calendar'), ' New Event']],
    // ['files',  [icon('folder-open'), ' New Repo']]
  ]

  var subpage = app.page.qs.type || 'post'
  pages = pages.map(function (page) {
    if (app.page.id == 'compose' && page[0] == subpage)
      return h('a.selected.sidenav-'+page[0], { href: '#/compose?type='+page[0] }, page[1])
    return h('a.sidenav-'+page[0], { href: '#/compose?type='+page[0] }, page[1])
  })
  if (app.page.id == 'compose') {
    pages.push(h('a.sidenav-cancel', { href: '#/' }, 'Cancel'))
  }

  return h('.sidenav', pages)
}

var welcomehelp =
exports.welcomehelp = function (app) {
  if (!app.user.profile)
    return
  if (Object.keys(app.user.profile.assignedTo).length == 0) {
    return h('.welcome-help',
      h('.well',
        h('h2', 'Let\'s get you connected!'),
        h('.big-btn', { onclick: app.ui.inviteModal },
          h('h3', 'Use an Invite'),
          h('p', 'Got a friend on the network? Ask them to send you an invite code, then click here to use it.')),
        h('.big-btn', { onclick: alert.bind(window, 'Todo!') },
          h('h3', 'Get an Invite'),
          h('p', 'Are you the first of your friends on SSB? You trend-setter! Click here to get an invite from the SSB team.'))))
  }
}

var sidehelp =
exports.sidehelp = function (app, opts) {
  return h('ul.list-unstyled.sidehelp',
    // h('li', h('button.btn.btn-link', { onclick: app.ui.showUserId }, 'Get your id')),
    h('li', h('button.btn.btn-link', { onclick: app.ui.followPrompt }, 'Invite a Friend')),
    h('li', h('button.btn.btn-link', { onclick: app.ui.inviteModal }, 'Accept Invitation')),
    (!opts || !opts.noMore) ? h('li', h('span', {style:'display: inline-block; padding: 6px 14px'}, a('#/help', 'More help'))) : ''
  )
}

exports.introhelp = function (app) {
  return h('.row',
    h('.col-xs-4',
      panel(h('span', 'Join a Pub Server ', h('small', 'recommended')),
        h('div',
          h('p', 'Ask the owner of a pub server for an ', a('#/help/pubs', 'invite code'), '.'),
          h('button.btn.btn-primary', { onclick: app.ui.followPrompt }, 'Use an invite')
        )
      )
    ),
    h('.col-xs-4',
      panel('Connect over WiFi',
        h('p', 'Open the ', a('#/address-book', 'address book'), ' and find peers on your WiFi in the ', h('strong', 'Network'), ' column.')
      )
    ),
    h('.col-xs-4',
      panel(h('span', 'Start a Pub Server ', h('small', 'advanced')),
        h('p',
          a('https://github.com/ssbc/scuttlebot#running-a-pub-server', 'Follow these instructions'),
          ' then hand out invite codes to friends.'
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
exports.page = function (app, id, content) {
  return h('#page.container-fluid.'+id+'-page', content)
}

exports.prettyRaw = require('./pretty-raw')
exports.messageVisuals = require('./message-visuals')
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
exports.contactSyncListing = require('./contact-sync-listing')
exports.notifications = require('./notifications')
exports.peers = require('./peers')
exports.postForm = require('./post-form')
exports.factForm = require('./fact-form')
exports.composer = require('./composer')
exports.imageUploader = require('./image-uploader')
exports.inviteForm = require('./invite-form')
exports.networkGraph = require('./network-graph')
exports.connectionGraph = require('./connection-graph')
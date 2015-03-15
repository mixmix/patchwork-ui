'use strict'
var h = require('hyperscript')
var baseEmoji = require('base-emoji')
var u = require('../lib/util')

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

var nameConfidence =
exports.nameConfidence = function (id, app) {
  if (app.nameTrustRanks[id] !== 1) {
    return [' ', h('a', 
      { title: 'This name was self-assigned and needs to be confirmed.', href: '#/profile/'+id },
      h('span.text-muted', icon('user'), '?')
    )]
  }
  return ''
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
  return [userlink(id, userName(app, id)), nameConfidence(id, app)]
}

var userName =
exports.userName = function (app, id) {
  return app.names[id] || u.shortString(id)
}

var profilePicUrl =
exports.profilePicUrl = function (app, id) {
  var url = '/img/default-prof-pic.png'
  var profile = app.profiles[id]
  if (profile) {
    if (profile.assignedBy[app.myid] && profile.assignedBy[app.myid].profilePic)
      url = '/ext/' + profile.assignedBy[app.myid].profilePic.ext
    else if (profile.self.profilePic)
      url = '/ext/' + profile.self.profilePic.ext
  }
  return url
}

var userlinkThin =
exports.userlinkThin = function (id, text, opts) {
  opts = opts || {}
  opts.className = (opts.className || '') + 'thin'
  return userlink(id, text, opts)
}

var hexagon =
exports.hexagon = function (img) {
  img = img ? 'url('+img+')' : 'none'
  return h('.hexagon', { style: 'background-image: '+img },
    h('.hexagon-inner1'),
    h('.hexagon-inner2'))
}

var userHexagon =
exports.userHexagon = function (app, id) {
  return h('a.user-hexagon', { href: '#/profile/'+id, title: userName(app, id) }, hexagon(profilePicUrl(app, id)))
}

var userHexagrid =
exports.userHexagrid = function (app, profiles, rowLen) {
  rowLen = rowLen || 3
  var els = [], row = []
  for (var k in profiles) {
    row.push(userHexagon(app, profiles[k].id))
    if (row.length >= rowLen) {
      els.push(h('div', row))
      row = []
    }
  }
  return h('.user-hexagrid', els)
}

var friendsHexagrid =
exports.friendsHexagrid = function (app, rowLen) {
  var friends = {}
  for (var k in app.profiles) {
    var p = app.profiles[k]
    if (p.assignedBy[app.myid] && p.assignedBy[app.myid].following)
      friends[k] = p
  }
  if (Object.keys(friends).length)
    return [h('h4.text-muted', 'Friends'), userHexagrid(app, friends, rowLen)]
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
    var cls = ''
    if (item[0] == opts.current)
      cls = '.selected'
    return h('a'+cls, { href: item[1] }, item[2])
  })
  return h('.navlinks', items)
}

var search =
exports.search = function (opts) {
  var searchInput = h('input.search', { type: 'text', name: 'search', placeholder: 'Search', value: opts.value })
  return h('form', { onsubmit: opts.onsearch }, searchInput)
}

var sidenav =
exports.sidenav = function (app) {
  var pages = [
  //[id, path, label],
    ['posts', '', icon('globe')],// h('span', { style: 'padding-left: 2px' }, 'feed')]],
    ['inbox', 'inbox', 'inbox ('+app.indexCounts.inboxUnread+')'],
    ['compose', 'compose', 'compose'],
    ['address-book', 'address-book', 'network'],
    ['adverts', 'adverts', 'adverts'],
    ['help', 'help', 'help']
  ]

  return h('.side-nav.full-height',
    pages.map(function (page) {
      if (page == '-')
        return h('hr')
      if (page[0] == app.page.id)
        return h('p.selected.side-nav-'+page[0], a('#/'+page[1], page[2]))
      return h('p.side-nav-'+page[0], a('#/'+page[1], page[2]))
    })
  )
}

var sidehelp =
exports.sidehelp = function (app, opts) {
  return h('ul.list-unstyled.sidehelp',
    h('li', h('button.btn.btn-link', { onclick: app.showUserId }, 'Get your id')),
    h('li', h('button.btn.btn-link', { onclick: app.followPrompt }, 'Add a contact')),
    h('li', h('button.btn.btn-link', { onclick: app.followPrompt }, 'Use an invite')),
    (!opts || !opts.noMore) ? h('li', h('span', {style:'display: inline-block; padding: 6px 14px'}, a('#/help', 'More help'))) : ''
  )
}

exports.introhelp = function (app) {
  return h('.row',
    h('.col-xs-4',
      panel(h('span', 'Join a Pub Server ', h('small', 'recommended')),
        h('div',
          h('p', 'Ask the owner of a pub server for an ', a('#/help/pubs', 'invite code'), '.'),
          h('button.btn.btn-primary', { onclick: app.followPrompt }, 'Use an invite')
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
exports.advertForm = require('./advert-form')
exports.adverts = require('./adverts')
exports.messageVisuals = require('./message-visuals')
exports.message = require('./message')
exports.messageThread = require('./message-thread')
exports.messageSummary = require('./message-summary')
exports.messageFeed = require('./message-feed')
exports.messageAttachments = require('./message-attachments')
exports.notifications = require('./notifications')
exports.address = require('./address')
exports.peers = require('./peers')
exports.postForm = require('./post-form')
exports.imageUploader = require('./image-uploader')
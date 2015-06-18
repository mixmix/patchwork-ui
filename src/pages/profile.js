'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var multicb = require('multicb')
var schemas = require('ssb-msg-schemas')
var pull = require('pull-stream')
var com = require('../com')
var u = require('../lib/util')

module.exports = function (app) {
  var pid      = app.page.param
  var profile  = app.users.profiles[pid]
  var name     = com.userName(app, pid)

  if (!profile) {
    if (mlib.isHash(pid)) {
      profile = {
        assignedBy: {},
        id: pid,
        isEmpty: true
      }
    } else {
      app.setPage('profile', h('.layout-twocol',
        h('.layout-main',
          h('.well', { style: 'margin-top: 5px; background: #fff' },
            h('h3', { style: 'margin-top: 0' }, 'Invalid user ID'),
            h('p',
              h('em', pid),
              ' is not a valid user ID. ',
              h('img.emoji', { src: '/img/emoji/disappointed.png', title: 'disappointed', width: 20, height: 20, style: 'vertical-align: top' }))))))
      return
    }
  }

  var done = multicb({ pluck: 1 })
  app.ssb.friends.all('follow', done())
  app.ssb.friends.all('trust', done())
  done(function (err, datas) {
    var graphs = { follow: datas[0], trust: datas[1] }
    graphs.follow[app.user.id] = graphs.follow[app.user.id] || {}
    graphs.trust[app.user.id]  = graphs.trust[app.user.id] || {}
    profile.assignedBy[app.user.id] = profile.assignedBy[app.user.id] || {}

    var isSelf = (pid == app.user.id)
    var isFollowing = graphs.follow[app.user.id][pid]
    var isFlagging = (graphs.trust[app.user.id][pid] == -1)
    var followers = Object.keys(graphs.follow).filter(function (id) { return graphs.follow[id][pid] })
    var flaggers = Object.keys(graphs.trust).filter(function (id) { return (graphs.follow[app.user.id][id] || id == app.user.id) && graphs.trust[id][pid] === -1 })

    // name conflict controls
    var nameConflictDlg
    var nameConflicts = []
    for (var id in app.users.names)
      if (id != pid && app.users.names[id] == app.users.names[pid])
        nameConflicts.push(id)
    if (nameConflicts.length && !isFollowing && app.users.nameTrustRanks[pid] !== 1) {
      var mutualFollowers = inEdges(graphs.follow, true, followedByMe)
      mutualFollowers = (mutualFollowers.length) ?
        h('p', h('strong', 'Mutual Followers:'), h('ul.list-inline', mutualFollowers)) :
        h('p.text-danger',
          (profile.isEmpty) ?
            'There is no information about this user.' :
            'Warning: This user is not followed by anyone you follow.')

      nameConflictDlg = h('.well', { style: 'margin-top: 5px; background: #fff' },
        h('h3', { style: 'margin-top: 0' }, 'Name Conflict!'),
        h('p', 'This is not the only user named "'+app.users.names[pid]+'," which may be a coincidence, or it may be the sign of an imposter! Make sure this is who you think it is before you follow them.'),
        h('h4', 'How can I tell?'),
        h('p', 'Check for mutual friends or warning flags. If you need to be sure, ask your friend for their contact ID. This user\'s contact ID is ', h('strong', pid)),
        h('h4', 'Conflicting users:'),
        h('ul', nameConflicts.map(function (id) { return h('li', com.user(app, id)) })),
        mutualFollowers,
        h('p', h('button.btn.btn-primary.btn-strong', { onclick: rename }, 'Choose Another Name')),
        h('small.text-muted', 'Beware of trolls pretending to be people you know!')
      )
    }
    function followedByMe (id) {
      return graphs.follow[app.user.id][id]
    }

    // flag controls
    var flaggersDlg
    if (flaggers.length) {
      flaggersDlg = h('.profile-flaggers',
        h('strong', 'Warning!'), ' This user has been flagged by ', flaggers.map(function (id) { return com.userImg(app, id)})
      )
    }

    var content = com.messageFeed(app, { feed: app.ssb.createFeedStream, filter: latestFeedFilter, infinite: true, onempty: onNoMsgs })
    function onNoMsgs (feedEl) {
      feedEl.appendChild(h('div', { style: 'margin-top: 5px; background: #fff; padding: 15px 15px 10px' },
        h('h3', { style: 'margin-top: 0' }, 'Umm... who is this?'),
        h('p', 'This person\'s feed hasn\'t been fetched yet, so we don\'t know who this is!'),
        h('p', h('strong', 'Hang Tight!'), h('br'), 'If you\'re following somebody that follows this person, you\'ll receive their data soon. Or, if you want, you can follow this mystery-person yourself.')
      ))
    }

    // render page
    app.setPage('profile', h('.layout-twocol',
      h('.layout-main',
        (isSelf) ? com.welcomehelp(app) : '',
        flaggersDlg,
        nameConflictDlg,
        content),
      h('.layout-rightnav',
        h('.profile-controls',
          com.contactPlaque(app, profile, graphs),
          (!isSelf) ?
            h('.btns',
              h('a.btn.btn-default.btn-strong.btn-block', { href: '#' }, com.icon('comment'), ' New Private Message'),
              h('.btns-group',
                h('a.btn.btn-default.btn-strong', { href: '#', onclick: toggleFollow }, com.icon('user'), ((isFollowing) ? ' Unfollow' : ' Follow')),
                ' ',
                h('a.btn.btn-default.btn-strong', { href: '#', onclick: rename }, com.icon('pencil'), ' Rename'),
                ' ',
                h('a.btn.btn-default.btn-strong', { href: '#', onclick: toggleFlag }, com.icon('flag'), ((isFlagging) ? ' Unflag' : ' Flag'))))
          :
            h('.btns.text-center', { style: 'margin-right: 40px' },
              h('a.btn.btn-default.btn-strong', { href: '#/setup' }, com.icon('pencil'), ' Edit Your Profile')),
          (!isSelf) ?
            com.connectionGraph(app, app.user.id, pid, { w: 5.5, drawLabels: false, touchEnabled: false, mouseEnabled: false, mouseWheelEnabled: false }) :
            com.networkGraph(app, { w: 5.5, drawLabels: false, touchEnabled: false, mouseEnabled: false, mouseWheelEnabled: false }),
          (flaggers.length) ? h('.relations', h('h4', 'flagged by'), com.userHexagrid(app, flaggers, { nrow: 4 })) : '',
          (followers.length) ? h('.relations', h('h4', 'followed by'), com.userHexagrid(app, followers, { nrow: 4 })) : ''))))

    function inEdges (g, v, filter) {
      var arr = []
      for (var userid in g) {
        if (g[userid][pid] == v && (!filter || filter(userid, g)))
          arr.push(h('li', com.userlinkThin(userid, app.users.names[userid])))
      }
      return arr      
    }
    
    function latestFeedFilter (msg) {
      var c = msg.value.content

      // post by this user
      if (msg.value.author == pid && ((c.type == 'post' && !c.repliesTo) || c.type == 'init'))
        return true

      // fact about this user
      if (c.type == 'fact' && c.factAbout && mlib.asLinks(c.factAbout, 'feed').filter(isLinkToProfile).length)
        return true

      return false
    }

    function aboutFeedFilter (msg) {
      var c = msg.value.content

      // fact about this user
      if (c.type == 'fact' && c.factAbout && mlib.asLinks(c.factAbout, 'feed').filter(isLinkToProfile).length)
        return true

      return false
    }

    function isLinkToProfile (link) {
      return link.feed == pid
    }

    // handlers

    function rename (e) {
      e.preventDefault()
      app.ui.setNamePrompt(pid)
    }

    function toggleFollow (e) {
      e.preventDefault()
      if (isSelf)
        return
      app.ui.pleaseWait(true, 500)
      schemas.addContact(app.ssb, pid, { following: !isFollowing }, function(err) {
        app.ui.pleaseWait(false)
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }

    function toggleFlag (e) {
      e.preventDefault()
      if (isSelf)
        return
      app.ui.pleaseWait(true, 500)
      schemas.addContact(app.ssb, pid, { trust: (isFlagging) ? 0 : -1 }, function(err) {
        app.ui.pleaseWait(false)
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }

  })
}
'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var multicb = require('multicb')
var schemas = require('ssb-msg-schemas')
var pull = require('pull-stream')
var com = require('../com')
var u = require('../util')
var markdown = require('../markdown')
var mentions = require('../mentions')

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
  app.ssb.friends.all('flag', done())
  done(function (err, datas) {
    var graphs = { follow: datas[0], flag: datas[1] }
    graphs.follow[app.user.id] = graphs.follow[app.user.id] || {}
    graphs.flag[app.user.id]   = graphs.flag[app.user.id] || {}
    profile.assignedBy[app.user.id] = profile.assignedBy[app.user.id] || {}

    var isSelf      = (pid == app.user.id)
    var isFollowing = graphs.follow[app.user.id][pid]
    var followsYou  = graphs.follow[pid] && graphs.follow[pid][app.user.id]
    var isFlagging  = graphs.flag[app.user.id][pid]
    var followers   = Object.keys(graphs.follow).filter(function (id) { return graphs.follow[id][pid] })
    var flaggers    = Object.keys(graphs.flag).filter(function (id) { return (graphs.follow[app.user.id][id] || id == app.user.id) && graphs.flag[id][pid] })

    // name conflict controls
    var nameConflictDlg
    var nameConflicts = []
    for (var id in app.users.names) {
      if (id != pid && app.users.names[id] == app.users.names[pid])
        nameConflicts.push(id)
    }
    if (nameConflicts.length) {
      nameConflictDlg = h('.well.white', { style: 'margin: 5px 14px' },
        h('h3', { style: 'margin-top: 0px' }, 'Heads up! ', h('small', 'This is not the only user named "'+app.users.names[pid]+'." There\'s also:')),
        h('ul.list-inline', nameConflicts.map(function (id) { return h('li', com.user(app, id)) })),
        h('p', { style: 'margin: 0' }, 'You may want to rename one of them to avoid confusion.')
      )
    }
    function followedByMe (id) {
      return graphs.follow[app.user.id][id]
    }

    // flag controls
    var flaggersDlg
    console.log(flaggers, graphs.flag)
    if (flaggers.length) {
      flaggersDlg = h('.profile-flaggers',
        h('h4', h('strong', 'Warning!'), ' This user has been flagged.'),
        flaggers.map(function (id) {
          var flag = graphs.flag[id][pid]
          if (flag.reason) {
            return h('p',
              com.icon('flag'),
              ' "', h('span', { innerHTML: mentions.render(markdown.emojis(flag.reason), app, flag.mentions) }), '"',
              ' —', com.user(app, id)
            )
          } else {
            return h('p',
              com.icon('flag'),
              h('em', ' No reason given'),
              ' —', com.user(app, id)
            )
          }
        })
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
        // nameConflictDlg,
        h('.profile-header',
          h('a.btn.btn-3d', { href: '#', onclick: privateMessage }, com.icon('envelope'), ' Private Message')),
        com.composer.header(app, { placeholder: 'Share a public message with @'+name, initval: '@'+name+' ' }),
        content),
      h('.layout-rightnav',
        h('.profile-controls',
          com.contactPlaque(app, profile, graphs),
          nameConflictDlg,
          (!isSelf) ?
          [
            (followsYou) ? h('.follows-you', 'Follows You') : '',
            h('.btns',
              h('.btns-group',
                h('a.btn.btn-3d', { href: '#', onclick: toggleFollow }, com.icon('user'), ((isFollowing) ? ' Unfollow' : ' Follow')),
                ' ',
                h('a.btn.btn-3d', { href: '#', onclick: renameModal }, com.icon('pencil'), ' Rename'),
                ' ',
                h('a.btn.btn-3d', { href: '#', onclick: flagModal }, com.icon('flag'), ((!!isFlagging) ? ' Unflag' : ' Flag'))))
          ] :
            h('.btns.text-center', { style: 'padding-right: 10px' },
              h('a.btn.btn-3d', { href: '#/setup' }, com.icon('pencil'), ' Edit Your Profile')),
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

    function privateMessage (e) {
      app.ui.pmSubwindow(e, { recipients: [pid] })
    }

    function renameModal (e) {
      e.preventDefault()
      app.ui.setNameModal(pid)
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

    function flagModal (e) {
      e.preventDefault()
      if (isSelf)
        return
      if (!isFlagging)
        app.ui.flagModal(pid)
      else {
        schemas.addContact(phoenix.ssb, pid, { flagged: false }, function (err) {
          if (err) swal('Error While Publishing', err.message, 'error')
          else app.refreshPage()
        })
      }
    }

  })
}
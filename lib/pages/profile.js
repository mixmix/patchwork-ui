'use strict'
var h = require('hyperscript')
var refs = require('ssb-ref')
var mlib = require('ssb-msgs')
var multicb = require('multicb')
var schemas = require('ssb-msg-schemas')
var pull = require('pull-stream')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var subwindows = require('../ui/subwindows')
var com = require('../com')
var u = require('../util')
var markdown = require('../markdown')
var social = require('../social-graph')

module.exports = function () {
  var pid      = app.page.param
  var profile  = app.users.profiles[pid]
  var name     = com.userName(pid)

  // user not found
  if (!profile) {
    if (refs.isFeedId(pid)) {
      profile = {
        assignedBy: {},
        id: pid,
        isEmpty: true
      }
    } else {
      ui.setPage('profile', h('.layout-twocol',
        h('.layout-main',
          h('.well', { style: 'margin-top: 5px; background: #fff' },
            h('h3', { style: 'margin-top: 0' }, 'Invalid user ID'),
            h('p',
              h('em', pid),
              ' is not a valid user ID. ',
              h('img.emoji', { src: './img/emoji/disappointed.png', title: 'disappointed', width: 20, height: 20, style: 'vertical-align: top' })
            )
          )
        )
      ))
      return
    }
  }

  var isSelf      = (pid == app.user.id)
  var isFollowing = social.follows(app.user.id, pid)
  var followsYou  = social.follows(pid, app.user.id)
  var hasFlagged  = social.flags(app.user.id, pid)
  var hasBlocked  = social.blocks(app.user.id, pid)
  var followers   = social.followers(app.user.id, pid, true)
  var followeds   = social.followeds(pid)
  var flaggers    = social.followedFlaggers(app.user.id, pid, true)

  // name conflict controls
  var nameConflictDlg
  var nameConflicts = []
  for (var id in app.users.names) {
    if (id != pid && app.users.names[id] == app.users.names[pid])
      nameConflicts.push(id)
  }
  if (nameConflicts.length) {
    nameConflictDlg = h('.well.white', { style: 'margin: -10px 15px 15px' },
      h('p', { style: 'margin-bottom: 10px' }, h('strong', 'Other users named "'+app.users.names[pid]+'":')),
      h('ul.list-inline', nameConflicts.map(function (id) { return h('li', com.user(id)) })),
      h('p', h('small', 'ProTip: You can rename users to avoid getting confused!'))
    )
  }

  // flag controls
  var flagMsgs
  if (flaggers.length) {
    flagMsgs = h('.profile-flags.message-feed')
    flaggers.forEach(function (id) {
      var flag = social.flags(id, pid)
      if (flag.reason && flag.key) {
        app.ssb.get(flag.key, function (err, flagMsg) {
          if (err) console.error(err)
          if (flagMsg) flagMsgs.appendChild(com.message({ key: flag.key, value: flagMsg }))
        })
      }
    })
  }

  // render page
  require('./webview')({
    param: pid,//'&BT4kj89QW+yUIa+DpU1wes50SfqRm2DZIN54RQAyPbc=.sha256',
    sideview: h('.profile-controls',
      com.contactPlaque(profile, followers.length, flaggers.length),
      (hasBlocked) ? h('.block', 'BLOCKED') : '',
      (!isSelf) ?
      [
        (followsYou) ? h('.follows-you', 'Follows You') : '',
        h('.btns',
          h('.btns-group',
            (hasBlocked) ? '' : h('a.btn.btn-3d', { href: '#', onclick: toggleFollow }, com.icon('user'), ((isFollowing) ? ' Unfollow' : ' Follow')),
            ' ',
            h('a.btn.btn-3d', { href: '#', onclick: renameModal }, com.icon('pencil'), ' Rename'),
            ' ',
            h('a.btn.btn-3d', { href: '#', onclick: flagModal }, com.icon('flag'), ((!!hasFlagged) ? ' Unflag' : ' Flag'))))
      ] :
        h('.btns.text-center', { style: 'padding-right: 10px' },
          h('a.btn.btn-3d', { href: '#/setup', title: 'Update your name or image' }, com.icon('pencil'), ' Edit Your Profile')),
      nameConflictDlg,
      (flaggers.length) ? h('.relations', h('h4', 'flagged by'), com.userHexagrid(flaggers, { nrow: 4, uneven: true })) : '',
      (followers.length) ? h('.relations', h('h4', 'followers'), com.userHexagrid(followers, { nrow: 4, uneven: true })) : '',
      (followeds.length) ? h('.relations', h('h4', 'follows'), com.userHexagrid(followeds, { nrow: 4, uneven: true })) : ''
    )
  })

  // handlers

  function renameModal (e) {
    e.preventDefault()
    modals.setName(pid)
  }

  function toggleFollow (e) {
    e.preventDefault()
    if (isSelf)
      return
    ui.pleaseWait(true, 500)
    if (isFollowing)
      app.ssb.publish(schemas.unfollow(pid), done)
    else
      app.ssb.publish(schemas.follow(pid), done)
    function done (err) {
      ui.pleaseWait(false)
      if (err) modals.error('Error While Publishing', err, 'This error occured while trying to un/follow somebody on their profile page.')
      else ui.refreshPage()
    }
  }

  function flagModal (e) {
    e.preventDefault()
    if (isSelf)
      return
    if (!hasFlagged)
      modals.flag(pid)
    else {
      var done = multicb()
      app.ssb.publish(schemas.unblock(pid), done())
      app.ssb.publish(schemas.unflag(pid), done())
      done(function (err) {
        if (err) modals.error('Error While Publishing', err, 'This error occured while trying to un/flag somebody on their profile page.')
        else ui.refreshPage()
      })
    }
  }
}
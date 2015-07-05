'use strict'
var h = require('hyperscript')
var refs = require('ssb-ref')
var mlib = require('ssb-msgs')
var multicb = require('multicb')
var schemas = require('ssb-msg-schemas')
var pull = require('pull-stream')
var com = require('../com')
var u = require('../util')
var markdown = require('../markdown')
var mentions = require('../mentions')
var social = require('../social-graph')

module.exports = function (app) {
  var pid      = app.page.param
  var profile  = app.users.profiles[pid]
  var name     = com.userName(app, pid)

  // user not found
  if (!profile) {
    if (refs.isFeedId(pid)) {
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

  var isSelf      = (pid == app.user.id)
  var isFollowing = social.follows(app, app.user.id, pid)
  var followsYou  = social.follows(app, pid, app.user.id)
  var hasFlagged  = social.flags(app, app.user.id, pid)
  var followers   = social.followers(app, pid)
  var flaggers    = social.followedFlaggers(app, app.user.id, pid, true)

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

  // flag controls
  var flaggersDlg
  if (flaggers.length) {
    flaggersDlg = h('.profile-flaggers',
      h('h4', h('strong', 'Warning!'), ' This user has been flagged.'),
      flaggers.map(function (id) {
        var flag = social.flags(app, id, pid)
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

  var content = com.messageFeed(app, { feed: feedFn, cursor: feedCursor, filter: feedFilter, infinite: true, onempty: onNoMsgs })
  function feedFn (opts) {
    opts = opts || {}
    opts.id = pid
    return app.ssb.createUserStream(opts)
  }
  function feedCursor (msg) {
    if (msg)
      return msg.value.sequence
  }
  function feedFilter (msg) {
    // post by this user
    var c = msg.value.content
    if (msg.value.author == pid && ((c.type == 'post' && !c.repliesTo) || c.type == 'init'))
      return true
  }
  function onNoMsgs (feedEl) {
    feedEl.appendChild(h('div', { style: 'margin: 5px 32px; background: #fff; padding: 15px 15px 10px' },
      h('h3', { style: 'margin-top: 0' }, 'Umm... who is this?'),
      h('p', 'This person\'s feed hasn\'t been fetched yet, so we don\'t know who this is!'),
      h('p', h('strong', 'Hang Tight!'), h('br'), 'If you\'re following somebody that follows this person, you\'ll receive their data soon. Or, if you want, you can follow this mystery-person yourself.')
    ))
  }

  // render page
  app.setPage('profile', h('.layout-twocol',
    h('.layout-main',
      flaggersDlg,
      // nameConflictDlg,
      h('.profile-header',
        h('a.btn.btn-3d', { href: '#', onclick: privateMessage }, com.icon('envelope'), ' Secret Message')),
      com.composer.header(app, { placeholder: 'Share a public message with @'+name, initval: '@'+name+' ' }),
      content),
    h('.layout-rightnav',
      h('.profile-controls',
        com.contactPlaque(app, profile, followers, flaggers),
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
              h('a.btn.btn-3d', { href: '#', onclick: flagModal }, com.icon('flag'), ((!!hasFlagged) ? ' Unflag' : ' Flag'))))
        ] :
          h('.btns.text-center', { style: 'padding-right: 10px' },
            h('a.btn.btn-3d', { href: '#/setup' }, com.icon('pencil'), ' Edit Your Profile')),
        (!isSelf) ?
          com.connectionGraph(app, app.user.id, pid, { w: 5.5, drawLabels: false, touchEnabled: false, mouseEnabled: false, mouseWheelEnabled: false }) :
          com.networkGraph(app, { w: 5.5, drawLabels: false, touchEnabled: false, mouseEnabled: false, mouseWheelEnabled: false }),
        (flaggers.length) ? h('.relations', h('h4', 'flagged by'), com.userHexagrid(app, flaggers, { nrow: 4 })) : '',
        (followers.length) ? h('.relations', h('h4', 'followed by'), com.userHexagrid(app, followers, { nrow: 4 })) : ''))))

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
    if (!hasFlagged)
      app.ui.flagModal(pid)
    else {
      schemas.addContact(phoenix.ssb, pid, { flagged: false }, function (err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }
  }
}
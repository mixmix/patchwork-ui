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
  var view     = app.page.qs.view || 'about'
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
      app.setPage('profile', h('.row',
        h('.col-xs-1'),
        h('.col-xs-7',
          h('.well', { style: 'margin-top: 5px; background: #fff' },
            h('h3', { style: 'margin-top: 0' }, 'Invalid user ID'),
            h('p',
              h('em', pid), ' is not a valid user ID. ',
                h('img.emoji', { src: '/img/emoji/disappointed.png', title: 'disappointed', width: 20, height: 20, style: 'vertical-align: top' })))),
        h('.col-xs-3')))
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
    var flaggers = Object.keys(graphs.trust).filter(function (id) { return graphs.trust[id][pid] === -1 })

    // name confidence controls
    var nameTrustDlg
    if (app.users.nameTrustRanks[pid] !== 1) {
      var mutualFollowers = inEdges(graphs.follow, true, followedByMe)
      mutualFollowers = (mutualFollowers.length) ?
        h('p', h('strong', 'Mutual Followers:'), h('ul.list-inline', mutualFollowers)) :
        h('p.text-danger',
          (profile.isEmpty) ?
            'There is no information about this user.' :
            'Warning: This user is not followed by anyone you follow.')

      nameTrustDlg = h('.well', { style: 'margin: 0 0 5px 62px; background: #fff' },
        h('h3', { style: 'margin-top: 0' }, (!!app.users.names[pid]) ? 'Is this "'+app.users.names[pid]+'?"' : 'Who is this user?'),
        h('p',
          'Users whose names you haven\'t confirmed will have a ',
          h('span.text-muted', com.icon('user'), '?'),
          ' next to them.'
        ),
        mutualFollowers,
        h('p', (!!app.users.names[pid]) ?
          [
            h('button.btn.btn-primary.btn-strong', { onclick: confirmName }, 'Use "'+app.users.names[pid]+'"'),
            ' or ',
            h('button.btn.btn-primary.btn-strong', { onclick: rename }, 'Choose Another Name')
          ] :
          h('button.btn.btn-primary', { onclick: rename }, 'Choose a Name')),
        h('small.text-muted', 'Beware of trolls pretending to be people you know!')
      )
    }
    function followedByMe (id) {
      return graphs.follow[app.user.id][id]
    }

    var content
    if (view == 'avatar') {
      // profile pics
      var pics = []
      if (profile) {
        if (profile.self.profilePic)
          pics.push(profilePic(profile.self.profilePic))
        Object.keys(profile.assignedBy).forEach(function(userid) {
          var given = profile.assignedBy[userid]
          if (given.profilePic)
            pics.push(profilePic(given.profilePic, userid))
        })
      }
      content = h('.profile-pics',
        com.imageUploader(app, { onupload: onImageUpload }),
        h('br'),
        pics)
      content.style.marginLeft = '62px'
    }
    else if (view == 'contacts') {
      content = com.contactFeed(app, { filter: contactFeedFilter, follows: graphs.follow })
      content.style.marginLeft = '62px'
    }
    else if (view == 'feed') {
      content = [
        h('.header-ctrls', com.composer.header(app, { suggested: '@'+name+' ' })),
        com.messageFeed(app, { feed: app.ssb.createFeedStream, filter: msgFeedFilter, infinite: true })
      ]
    }
    else {
      content = [
        h('.header-ctrls', com.composer.header(app, { suggested: '@'+name+' ' })),
        com.messageFeed(app, { feed: app.ssb.createFeedStream, filter: aboutFeedFilter, infinite: true })
      ]
    }

    // render page
    app.setPage('profile', h('.row',
      h('.col-xs-1'),
      h('.col-xs-7',
        nameTrustDlg,
        h('.header-ctrls', { style: 'margin: 3px 62px' },
          com.nav({
            current: view,
            items: [
              ['about',    makeUri({ view: 'about' }),    'About'],
              ['feed',     makeUri({ view: 'feed' }),     'All Posts'],
              ['contacts', makeUri({ view: 'contacts' }), 'Contacts'],
              ['avatar',   makeUri({ view: 'avatar' }),   'Avatar']
            ]
          })),
        content),
      h('.col-xs-3',
        h('.profile-controls',
          com.contactPlaque(app, profile, graphs),
          (!isSelf) ?
            h('.btns',
              h('a.btn.btn-default.btn-strong', { href: '#', onclick: toggleFollow }, com.icon('user'), ((isFollowing) ? ' Unfollow' : ' Follow')),
              ' ',
              h('a.btn.btn-default.btn-strong', { href: '#', onclick: rename }, com.icon('pencil'), ' Rename'),
              ' ',
              h('a.btn.btn-default.btn-strong', { href: '#', onclick: toggleFlag }, com.icon('flag'), ((isFlagging) ? ' Unflag' : ' Flag')))
            : '',
          (flaggers.length) ? h('.relations', h('h4', 'flagged by'), com.userHexagrid(app, flaggers, { nrow: 4 })) : '',
          (followers.length) ? h('.relations', h('h4', 'followed by'), com.userHexagrid(app, followers, { nrow: 4 })) : ''))))

    function makeUri (opts) {
      var qs=''
      if (opts !== false) {
        opts = opts || {}
        opts.view = ('view' in opts) ? opts.view : view
        qs = '?view=' + encodeURIComponent(opts.view)
      }
      return '#/profile/'+pid+qs
    }

    function profilePic (pic, author) {
      var authorName
      if (!author) {
        author = pid
        authorName = name
      } else {
        authorName = app.users.names[author]
      }
      return h('.pic', { 'data-overlay': 'Use for '+name },
        h('a', { href: '#', onclick: setProfilePic(pic) }, h('img', { src: '/ext/'+pic.ext })),
        h('p', 'by ', com.userlinkThin(author, authorName))
      )
    }

    function outEdges (g, v, filter) {
      var arr = []
      if (g[pid]) {
        for (var userid in g[pid]) {
          if (g[pid][userid] == v && (!filter || filter(userid, g)))
            arr.push(h('li', com.userlinkThin(userid, app.users.names[userid])))
        }
      }
      return arr
    }

    function inEdges (g, v, filter) {
      var arr = []
      for (var userid in g) {
        if (g[userid][pid] == v && (!filter || filter(userid, g)))
          arr.push(h('li', com.userlinkThin(userid, app.users.names[userid])))
      }
      return arr      
    }

    function msgFeedFilter (msg) {
      var c = msg.value.content

      if (msg.value.author !== pid)
        return false

      return true
    }

    function aboutFeedFilter (msg) {
      var c = msg.value.content

      if (msg.value.author == pid && c.type == 'post' && !c.repliesTo)
        return true

      return false
    }

    function contactFeedFilter (prof) {
      var id = prof.id

      /*else if (view == 'followers') {
        if (graphs.follow[id] && graphs.follow[id][pid] && !primary)
          return true
      }*/

      if (graphs.follow[pid] && graphs.follow[pid][id])
        return true
      return false
    }

    // handlers

    function rename (e) {
      e.preventDefault()
      app.ui.setNamePrompt(pid)
    }

    function confirmName (e) {
      e.preventDefault()

      app.ui.pleaseWait(true, 500)
      schemas.addContact(app.ssb, pid, { name: app.users.names[pid] }, function (err) {
        app.ui.pleaseWait(false)
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
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

    function setProfilePic (link) {
      return function (e) {
        e.preventDefault()
        if (profile && profile.assignedBy[app.user.id] && profile.assignedBy[app.user.id].profilePic && profile.assignedBy[app.user.id].profilePic.ext == link.ext)
          return
        app.ui.pleaseWait(true, 500)
        schemas.addContact(app.ssb, pid, { profilePic: link }, function (err) {
          app.ui.pleaseWait(false)
          if (err) swal('Error While Publishing', err.message, 'error')
          else app.refreshPage()        
        })
      }
    }

    function onImageUpload (hasher) {
      var link = {
        ext: hasher.digest,
        size: hasher.size,
        type: 'image/png',
        width: 275,
        height: 275
      }
      app.ui.pleaseWait(true, 500)
      schemas.addContact(app.ssb, pid, { profilePic: link }, function (err) {
        app.ui.pleaseWait(false)
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()        
      })
    }

  })
}
'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var schemas = require('ssb-msg-schemas')
var com = require('../com')
var util = require('../lib/util')

module.exports = function (app) {
  var view = app.page.qs.view || 'feed'

  var pid = app.page.param
  var done = multicb({ pluck: 1 })
  app.ssb.friends.all('follow', done())
  app.ssb.friends.all('trust', done())
  done(function (err, datas) {
    var graphs = {
      follow: datas[0],
      trust:  datas[1]
    }
    graphs.follow[app.myid] = graphs.follow[app.myid] || {}
    graphs.trust [app.myid] = graphs.trust [app.myid] || {}
    var isFollowing = graphs.follow[app.myid][pid]
    var profile = app.profiles[pid]
    var name = com.userName(app, pid)
    var profileImg = com.profilePicUrl(app, pid)
    var primary

    // secondary feeds (applications)
    if (profile && profile.primary) {
      primary = profile.primary
      if (profile.self.name) // use own name
        name = profile.self.name
    }

    // name confidence controls
    var nameTrustDlg
    if (app.nameTrustRanks[pid] !== 1) {
      nameTrustDlg = h('.well', { style: 'margin-top: 0.5em; border-color: #aaa' },
        h('h3', { style: 'margin-top: 0' }, (!!app.names[pid]) ? 'Is this "'+app.names[pid]+'?"' : 'Who is this user?'),
        h('p',
          'Users whose identity you haven\'t confirmed will have a ',
          h('span.text-muted', com.icon('user'), '?'),
          ' next to their name.'
        ),
        (!!app.names[pid]) ?
          [
            h('button.btn.btn-primary', { onclick: confirmName }, 'Confirm This Name'),
            ' or ',
            h('button.btn.btn-primary', { onclick: rename }, 'Choose Another Name')
          ] :
          h('button.btn.btn-primary', { onclick: rename }, 'Choose a Name')
      )
    }

    // profile controls
    var followbtn, trustbtn, flagbtn, renamebtn
    renamebtn = h('button.btn.btn-primary', {title: 'Rename', onclick: rename}, com.icon('pencil'))
    if (pid !== app.myid) {
      followbtn = (isFollowing)
        ? h('button.btn.btn-primary', { onclick: unfollow }, com.icon('minus'), ' Unfollow')
        : h('button.btn.btn-primary', { onclick: follow }, com.icon('plus'), ' Follow')
      trustbtn = (graphs.trust[app.myid][pid] == 1)
        ? h('button.btn.btn-primary', { onclick: detrust }, com.icon('remove'), ' Untrust')
        : (!graphs.trust[app.myid][pid])
          ? h('button.btn.btn-primary', { onclick: trustPrompt }, com.icon('lock'), ' Trust')
          : ''
      flagbtn = (graphs.trust[app.myid][pid] == -1)
        ? h('button.btn.btn-primary', { onclick: detrust }, com.icon('ok'), ' Unflag')
        : (!graphs.trust[app.myid][pid])
          ? h('button.btn.btn-primary',{ onclick: flagPrompt },  com.icon('flag'), ' Flag')
          : ''
    }

    var content
    if (view == 'pics') {
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
        h('p', h('a.btn.btn-primary', { href: makeUri(), innerHTML: '&laquo; Back to Feed'})),
        com.imageUploader(app, { onupload: onImageUpload }),
        h('br'),
        pics)
    }
    else {
      // messages
      content = [
        h('.header-ctrls',
          com.search({
            value: '',
            onsearch: null
          })),
        com.messageFeed(app, { feed: app.ssb.createFeedStream, filter: function (msg) {
          return msg.value.author == pid
        }})
      ]
    }

    // given names
    var givenNames = []
    if (profile) {
      if (profile.self.name)
        givenNames.push(h('li', profile.self.name + ' (self-assigned)'))
      Object.keys(profile.assignedBy).forEach(function(userid) {
        var given = profile.assignedBy[userid]
        if (given.name)
          givenNames.push(h('li', given.name + ' by ', com.userlinkThin(userid, app.names[userid])))
      })
    }

    // follows, trusts, blocks
    var follows   = outEdges(graphs.follow, true)
    var followers = inEdges(graphs.follow, true)
    var trusts    = outEdges(graphs.trust, 1)
    var trusters  = inEdges(graphs.trust, 1)
    var flags     = outEdges(graphs.trust, -1)
    var flaggers  = inEdges(graphs.trust, -1)

    // applications
    var apps = []
    if (profile) {
      for (var sid in profile.secondaries) {
        var sec = app.profiles[sid]
        if (sec)
          apps.push(h('li', com.userlinkThin(sid, sec.self.name)))
        else
          apps.push(h('li', com.userlinkThin(sid)))
      }
    }

    // render page
    var joinDate = (profile) ? util.prettydate(new Date(profile.createdAt), true) : '-'
    app.setPage('profile', h('.row',
      h('.col-xs-1', com.sidenav(app)),
      h('.col-xs-8', 
        nameTrustDlg,
        content),
      h('.col-xs-3.full-height',
        com.notifications(app),
        h('.profile-controls',
          h('.section',
            h('a.profpic', { href: makeUri({ view: 'pics' }) }, h('img', { src: profileImg })),
            h('h2', name, com.nameConfidence(pid, app), renamebtn),
            (primary) ?
              h('h2', h('small', com.user(app, primary), '\'s feed')) :
              '',
            h('p.text-muted', 'joined '+joinDate)
          ),
          h('.section', h('p', followbtn), h('p', trustbtn), h('p', flagbtn)),
          (givenNames.length)
            ? h('.section',
              h('strong', 'Nicknames'),
              h('br'),
              h('ul.list-unstyled', givenNames)
            )
            : '',
          trusters.length  ? h('.section', h('strong.text-success', com.icon('ok'), ' Trusted by'), h('br'), h('ul.list-unstyled', trusters)) : '',
          flaggers.length  ? h('.section', h('strong.text-danger', com.icon('flag'), ' Flagged by'), h('br'), h('ul.list-unstyled', flaggers)) : '',
          followers.length ? h('.section', h('strong', 'Followed By'), h('br'), h('ul.list-unstyled', followers)) : '',
          apps.length      ? h('.section', h('strong', 'Applications'), h('br'), h('ul.list-unstyled', apps)) : '',
          follows.length   ? h('.section', h('strong', 'Followed'), h('br'), h('ul.list-unstyled', follows)) : '',
          trusts.length    ? h('.section', h('strong', 'Trusted'), h('br'), h('ul.list-unstyled', trusts)) : '',
          flags.length     ? h('.section', h('strong', 'Flagged'), h('br'), h('ul.list-unstyled', flags)) : ''))))

    function makeUri (opts) {
      var qs=''
      if (opts) {
        opts.v = ('view' in opts) ? opts.view : ''
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
        authorName = app.names[author]
      }
      return h('.pic',
        h('a', { href: '#', onclick: setProfilePic(pic) }, h('img', { src: '/ext/'+pic.ext })),
        h('p', 'by ', com.userlinkThin(author, authorName))
      )
    }

    function outEdges(g, v) {
      var arr = []
      if (g[pid]) {
        for (var userid in g[pid]) {
          if (g[pid][userid] == v && !profile.secondaries[userid])
            arr.push(h('li', com.userlinkThin(userid, app.names[userid])))
        }
      }
      return arr
    }

    function inEdges(g, v) {
      var arr = []
      for (var userid in g) {
        if (g[userid][pid] == v && !profile.secondaries[userid])
          arr.push(h('li', com.userlinkThin(userid, app.names[userid])))
      }
      return arr      
    }

    // handlers

    function trustPrompt (e) {
      e.preventDefault()
      swal({
        title: 'Trust '+util.escapePlain(name)+'?',
        text: [
          'Use their data (names, trusts, flags) in your own account?',
          'Only do this if you know this account is your friend\'s, you trust them, and you think other people should too!'
        ].join(' '),
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#12b812',
        confirmButtonText: 'Trust'
      }, function() {
        app.updateContact(pid, { trust: 1 }, function (err) {
          if (err) swal('Error While Publishing', err.message, 'error')
          else app.refreshPage()
        })
      })
    }

    function flagPrompt (e) {
      e.preventDefault()
      swal({
        title: 'Flag '+util.escapePlain(name)+'?',
        text: [
          'Warn people about this user?',
          'This will hurt their network reputation and cause fewer people to trust them.',
          'Only do this if you believe they are a spammer, troll, or attacker.'
        ].join(' '),
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d9534f',
        confirmButtonText: 'Flag'
      }, function() {
        app.updateContact(pid, { trust: -1 }, function (err) {
          if (err) swal('Error While Publishing', err.message, 'error')
          else app.refreshPage()
        })
      })
    }

    function detrust (e) {
      e.preventDefault()
      app.updateContact(pid, { trust: 0 }, function(err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }
    
    function follow (e) {
      e.preventDefault()
      if (!graphs.follow[app.myid][pid]) {
        app.updateContact(pid, { following: true }, function(err) {
          if (err) swal('Error While Publishing', err.message, 'error')
          else app.refreshPage()
        })
      }
    }

    function unfollow (e) {
      e.preventDefault()
      if (graphs.follow[app.myid][pid]) {
        app.updateContact(pid, { following: false }, function(err) {
          if (err) swal('Error While Publishing', err.message, 'error')
          else app.refreshPage()
        })
      }
    }

    function rename (e) {
      e.preventDefault()
      app.setNamePrompt(pid)
    }

    function confirmName (e) {
      e.preventDefault()
      app.updateContact(pid, { name: app.names[pid] }, function (err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }

    function setProfilePic (link) {
      return function (e) {
        e.preventDefault()
        if (profile && profile.assignedBy[app.myid] && profile.assignedBy[app.myid].profilePic && profile.assignedBy[app.myid].profilePic.ext == link.ext)
          return
        app.updateContact(pid, { profilePic: link }, function (err) {
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
      app.updateContact(pid, { profilePic: link }, function (err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()        
      })
    }

  })
}
module.exports.isHubPage = true
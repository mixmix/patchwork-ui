'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var schemas = require('ssb-msg-schemas')
var com = require('../com')
var util = require('../lib/util')

module.exports = function (app) {
  var view = app.page.qs.view || 'timeline'

  var pid = app.page.param
  var done = multicb({ pluck: 1 })
  app.ssb.friends.all('follow', done())
  app.ssb.friends.all('trust', done())
  app.ssb.phoenix.getAllProfiles(done())
  done(function (err, datas) {
    var graphs = {
      follow: datas[0],
      trust:  datas[1]
    }
    graphs.follow[app.myid] = graphs.follow[app.myid] || {}
    graphs.trust [app.myid] = graphs.trust [app.myid] || {}
    var isFollowing = graphs.follow[app.myid][pid]
    var profiles = datas[2]
    var profile = profiles[pid]
    var name = app.names[pid] || util.shortString(pid)

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
    var followbtn, blockbtn, renamebtn
    if (pid === app.myid) {
      renamebtn = h('button.btn.btn-primary', {title: 'Rename', onclick: rename}, com.icon('pencil'))
    } else {
      renamebtn = h('button.btn.btn-primary', {title: 'Rename', onclick: rename}, com.icon('pencil'))
      followbtn = (isFollowing)
        ? h('button.btn.btn-primary', { onclick: unfollow }, com.icon('minus'), ' Remove Contact')
        : h('button.btn.btn-primary', { onclick: follow }, com.icon('plus'), ' Add Contact')
      blockbtn = (graphs.trust[app.myid][pid] == -1)
        ? h('button.btn.btn-primary', { onclick: detrust }, com.icon('ok'), ' Unblock')
        : h('button.btn.btn-primary',{ onclick: blockPompt },  com.icon('remove'), ' Block')
    } 

    var content
    if (view == 'timeline') {
      // messages
      content = com.messageFeed(app, app.ssb.createFeedStream, function (msg) {
        return msg.value.author == pid
      })
    } else if (view == 'about') {
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

      // follows, trusts, flags
      var follows   = outEdges(graphs.follow, true)
      var followers = inEdges(graphs.follow, true)
      var trusts    = outEdges(graphs.trust, 1)
      var flags     = outEdges(graphs.trust, -1)
      var flaggers  = inEdges(graphs.trust, -1)
      content = h('div', 
        (givenNames.length)
          ? h('.section',
            h('small', h('strong', 'Nicknames')),
            h('br'),
            h('ul.list-unstyled', givenNames)
          )
          : '',
        flaggers.length  ? h('.section', h('small', h('strong', 'Blocked by')), h('br'), h('ul.list-unstyled', flaggers)) : '',
        follows.length   ? h('.section', h('small', h('strong', 'Contacts')), h('br'), h('ul.list-unstyled', follows)) : '',
        followers.length ? h('.section', h('small', h('strong', 'Followed by')), h('br'), h('ul.list-unstyled', followers)) : '',
        flags.length     ? h('.section', h('small', h('strong', 'Blocked')), h('br'), h('ul.list-unstyled', flags)) : ''
      )
    } else {
      // contacts
      function listFn (opts) {
        opts.type = 'init'
        return app.ssb.messagesByType(opts)
      }
      graphs.follow[pid] = graphs.follow[pid] || {}
      function filterFn (msg) {
        return graphs.follow[pid][msg.value.author]
      }
      var syncers = inEdges(graphs.trust, 1)
      var syncing = (graphs.trust[app.myid][pid] === 1)
      content = h('.profile-contacts',
        (pid !== app.myid) ? h('p', h('button.btn.btn-primary.btn-strong.sync-toggle'+(syncing?'.on':''), { onclick: toggleSync })) : '',
        syncers.length ? h('p', 'Currently Syncing:', h('ul.list-unstyled', syncers)) : '',
        com.messageFeed(app, listFn, filterFn, com.address(app, profiles, graphs.follow)))
    }

    // render page
    var joinDate = (profile) ? util.prettydate(new Date(profile.createdAt), true) : '-'
    app.setPage('profile', h('.row',
      h('.col-xs-1', com.sidenav(app)),
      h('.col-xs-8', 
        nameTrustDlg, 
        h('.header-ctrls',
          com.search({
            value: '',
            onsearch: null
          }),
          com.nav({
            current: view,
            items: [
              ['timeline', makeUri({ view: 'timeline' }), 'Timeline'],
              ['about', makeUri({ view: 'about' }), 'About ' + name],
              ['address-book', makeUri({ view: 'address-book' }), 'Their Contacts'],
            ]
          })),
        content),
      h('.col-xs-3.profile-controls.full-height',
        h('.section',
          h('img.profpic', { src: '/img/default-prof-pic.png' }),
          h('h2', name, com.nameConfidence(pid, app), renamebtn),
          h('p.text-muted', 'joined '+joinDate)
        ),
        h('.section', h('p', followbtn), h('p', blockbtn)))))

    function makeUri (opts) {
      opts.v = ('view' in opts) ? opts.view : ''
      return '#/profile/'+pid+'?view=' + encodeURIComponent(opts.view)
    }

    function outEdges(g, v) {
      var arr = []
      if (g[pid]) {
        for (var userid in g[pid]) {
          if (g[pid][userid] == v)
            arr.push(h('li', com.userlinkThin(userid, app.names[userid])))
        }
      }
      return arr
    }

    function inEdges(g, v) {
      var arr = []
      for (var userid in g) {
        if (g[userid][pid] == v)
          arr.push(h('li', com.userlinkThin(userid, app.names[userid])))
      }
      return arr      
    }

    // handlers

    function toggleSync (e) {
      e.preventDefault()
      if (graphs.trust[app.myid][pid] !== 1) {
        swal({
          title: 'Trust '+util.escapePlain(name)+'\'s Contacts?',
          text: [
            'Use the contact list published by this user?',
            'Only do this if you trust this user to publish valid contact lists.'
          ].join(' '),
          type: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#12b812',
          confirmButtonText: 'Import Contacts'
        }, function() {
          app.updateContact(pid, { trust: 1 }, function (err) {
            if (err) swal('Error While Publishing', err.message, 'error')
            else app.refreshPage()
          })
        })
      } else {
        app.updateContact(pid, { trust: 0 }, function(err) {
          if (err) swal('Error While Publishing', err.message, 'error')
          else app.refreshPage()
        })
      }
    }

    function blockPompt (e) {
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

  })
}
module.exports.isHubPage = true
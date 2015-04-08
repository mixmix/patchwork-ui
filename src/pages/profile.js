'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var schemas = require('ssb-msg-schemas')
var com = require('../com')
var u = require('../lib/util')

module.exports = function (app) {
  var pid      = app.page.param
  var view     = app.page.qs.view || 'feed'
  var queryStr = app.page.qs.q || ''
  var list     = app.page.qs.list || ''
  var profile  = app.profiles[pid]
  var name     = com.userName(app, pid)

  var done = multicb({ pluck: 1 })
  app.ssb.friends.all('follow', done())
  done(function (err, datas) {
    var graphs = { follow: datas[0] }
    graphs.follow[app.myid] = graphs.follow[app.myid] || {}
    profile.assignedBy[app.myid] = profile.assignedBy[app.myid] || {}
    var followers = inEdges(graphs.follow, true)
    var isSelf = (pid == app.myid)
    var isFollowing = graphs.follow[app.myid][pid]

    // votes
    var upvoters = [], downvoters = []
    for (var userid in profile.assignedBy) {
      if (profile.assignedBy[userid].vote === 1)
        upvoters.push(userid)
      if (profile.assignedBy[userid].vote === -1)
        downvoters.push(userid)
    }

    // name confidence controls
    var nameTrustDlg
    if (app.nameTrustRanks[pid] !== 1) {
      var mutualFollowers = inEdges(graphs.follow, true, followedByMe)
      mutualFollowers = (mutualFollowers.length) ?
        h('p', h('strong', 'Mutual Followers:'), h('ul.list-inline', mutualFollowers)) :
        h('p.text-danger', 'Warning: This user is not followed by anyone you follow.')

      nameTrustDlg = h('.well', { style: 'margin-top: 5px; background: #fff' },
        h('h3', { style: 'margin-top: 0' }, (!!app.names[pid]) ? 'Is this "'+app.names[pid]+'?"' : 'Who is this user?'),
        h('p',
          'Users whose names you haven\'t confirmed will have a ',
          h('span.text-muted', com.icon('user'), '?'),
          ' next to them.'
        ),
        mutualFollowers,
        h('p', (!!app.names[pid]) ?
          [
            h('button.btn.btn-primary.btn-strong', { onclick: confirmName }, 'Use "'+app.names[pid]+'"'),
            ' or ',
            h('button.btn.btn-primary.btn-strong', { onclick: rename }, 'Choose Another Name')
          ] :
          h('button.btn.btn-primary', { onclick: rename }, 'Choose a Name')),
        h('small.text-muted', 'Beware of trolls pretending to be people you know!')
      )
    }
    function followedByMe (id) {
      return graphs.follow[app.myid][id]
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
    }
    else if (view == 'contacts') {
      list = list || 'following'
      content = [
        h('.header-ctrls',
          com.nav({
            current: list,
            items: [
              ['following', makeUri({ list: 'following' }), 'Following'],
              ['followers', makeUri({ list: 'followers' }), 'Followers'],
              ['apps',      makeUri({ list: 'apps' }),      'Applications']
            ]
          }),
          com.search({
            value: queryStr,
            onsearch: onsearch
          })),
        com.contactFeed(app, { filter: contactFeedFilter, follows: graphs.follow })
      ]
    }
    else {
      // messages
      list = list || 'all'
      content = [
        h('.header-ctrls',
          com.nav({
            current: list,
            items: [
              ['all',      makeUri({ view: '', list: 'all' }),      'All'],
              ['posts',    makeUri({ view: '', list: 'posts' }),    'Posts'],
              ['allposts', makeUri({ view: '', list: 'allposts' }), 'Posts & Replies'],
              ['data',     makeUri({ view: '', list: 'data' }),     'Data'],
              ['actions',  makeUri({ view: '', list: 'actions' }),  'Actions']
            ]
          }),
          com.search({
            value: queryStr,
            onsearch: onsearch
          })),
        com.messageFeed(app, { feed: app.ssb.createFeedStream, filter: msgFeedFilter })
      ]
    }

    // render page
    app.setPage('profile', h('.row',
      h('.col-xs-1', com.sidenav(app)),
      h('.col-xs-8', 
        nameTrustDlg,
        content),
      h('.col-xs-3.full-height',
        com.notifications(app),
        h('.profile-controls',
          com.contactSummary(app, profile, graphs.follow),
          h('.header-ctrls.big.light',
            com.nav({
              current: view,
              items: [
                ['feed',      makeUri({ view: 'feed', list: '' }),      [com.icon('list'), ' Feed']],
                ['contacts',  makeUri({ view: 'contacts', list: '' }),  [com.icon('book'), ' Contacts']],
                // ['about',     makeUri({ view: 'about', list: '' }),     [com.icon('question-sign'), ' About']],
                ['avatar',    makeUri({ view: 'avatar', list: '' }),    [com.icon('picture'), ' Avatar']]
              ]
            })),
          (profile.upvotes) ? h('.relations', h('h4', com.icon('triangle-top'), 's'), com.userHexagrid(app, upvoters, { nrow: 4 })) : '',
          (profile.downvotes) ? h('.relations', h('h4', com.icon('triangle-bottom'), 's'), com.userHexagrid(app, downvoters, { nrow: 4 })) : ''))))

    function makeUri (opts) {
      var qs=''
      if (opts !== false) {
        opts = opts || {}
        opts.view = ('view' in opts) ? opts.view : view
        opts.q    = ('q'    in opts) ? opts.q    : queryStr
        opts.list = ('list' in opts) ? opts.list : list
        qs = '?view=' + encodeURIComponent(opts.view) + '&q=' + encodeURIComponent(opts.q) + '&list=' + encodeURIComponent(opts.list)
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

    function outEdges (g, v, filter) {
      var arr = []
      if (g[pid]) {
        for (var userid in g[pid]) {
          if (g[pid][userid] == v && (!filter || filter(userid, g)))
            arr.push(h('li', com.userlinkThin(userid, app.names[userid])))
        }
      }
      return arr
    }

    function inEdges (g, v, filter) {
      var arr = []
      for (var userid in g) {
        if (g[userid][pid] == v && (!filter || filter(userid, g)))
          arr.push(h('li', com.userlinkThin(userid, app.names[userid])))
      }
      return arr      
    }

    function msgFeedFilter (msg) {
      var c = msg.value.content

      if (msg.value.author !== pid)
        return false

      if (list == 'posts') {
        if (c.type !== 'post' || c.repliesTo)
          return false
      }
      else if (list == 'allposts') {
        if (c.type !== 'post')
          return false
      }
      else if (list == 'data') {
        // no standard message types
        if (c.type === 'init' || c.type === 'post' || c.type === 'contact' || c.type === 'pub')
          return false
      }
      else if (list == 'actions') {
        if (c.type !== 'init' && c.type !== 'contact' && c.type !== 'pub')
          return false
      }

      if (!queryStr)
        return true

      var author = app.names[msg.value.author] || msg.value.author
      var regex = new RegExp(queryStr.replace(/\s/g, '|'))
      if (regex.exec(author) || regex.exec(c.type))
        return true
      if (c.type == 'post' && regex.exec(c.text))
        return true
      return false
    }

    function contactFeedFilter (prof) {
      var id = prof.id
      var primary = (prof && prof.primary) ? prof.primary : false

      if (queryStr) {
        var author = app.names[id] || id
        var regex = new RegExp(queryStr.replace(/\s/g, '|'))
        if (!regex.exec(author))
          return false
      }

      if (list == 'following') {
        if (graphs.follow[pid] && graphs.follow[pid][id] && !primary)
          return true
      }
      else if (list == 'followers') {
        if (graphs.follow[id] && graphs.follow[id][pid] && !primary)
          return true
      }
      else if (list == 'apps') {
        if (primary === pid)
          return true
      }

      return false
    }

    // handlers

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

    function onsearch (e) {
      e.preventDefault()
      window.location.hash = makeUri({ q: e.target.search.value })
    }

  })
}
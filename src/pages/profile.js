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
  var list     = app.page.qs.list || 'all'
  var profile  = app.profiles[pid]
  var name     = com.userName(app, pid)

  var done = multicb({ pluck: 1 })
  app.ssb.friends.all('follow', done())
  u.fetchFeedVotes(app, pid, done())
  done(function (err, datas) {
    var graphs = { follow: datas[0] }
    var voteStats = datas[1]
    graphs.follow[app.myid] = graphs.follow[app.myid] || {}
    var followers = inEdges(graphs.follow, true)
    var isSelf = (pid == app.myid)
    var isFollowing = graphs.follow[app.myid][pid]

    // secondary feeds (applications)
    var primary
    if (profile && profile.primary) {
      primary = profile.primary
      if (profile.self.name) // use own name
        name = profile.self.name
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
    if (view == 'pics') {
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
        h('p', h('a.btn.btn-primary', { href: makeUri(false), innerHTML: '&laquo; Back to Feed'})),
        com.imageUploader(app, { onupload: onImageUpload }),
        h('br'),
        pics)
    }
    else {
      // messages
      content = [
        h('.header-ctrls',
          com.nav({
            current: list,
            items: [
              ['posts',    makeUri({ view: '', list: 'posts' }),    'Posts'],
              ['allposts', makeUri({ view: '', list: 'allposts' }), 'Posts & Replies'],
              ['data',     makeUri({ view: '', list: 'data' }),     'Data'],
              ['actions',  makeUri({ view: '', list: 'actions' }),  'Actions'],
              ['all',      makeUri({ view: '', list: 'all' }),      'All']
            ]
          }),
          com.search({
            value: queryStr,
            onsearch: onsearch
          })),
        com.messageFeed(app, { feed: app.ssb.createFeedStream, filter: msgFeedFilter })
      ]
    }

    // profile ctrl totem
    var profileImg = com.profilePicUrl(app, pid)
    var totem = h('.totem',
      h('a.corner.topleft'+(isFollowing?'.selected':''),
        { href: '#', onclick: toggleFollow, 'data-overlay': (isSelf?'Your Followers':(isFollowing?'Unfollow':'Follow')) }, 
        h('.corner-inner', followers.length, com.icon('user'))),
      h('a.corner.botleft'+(voteStats.uservote===1?'.selected':''),
        { href: '#', onclick: makeVoteCb(1), 'data-overlay': (isSelf?'Your Upvotes':(voteStats.uservote===1?'Undo Upvote':'Upvote')) }, 
        h('.corner-inner', voteStats.upvoters.length, com.icon('triangle-top'))),
      h('a.corner.botright'+(voteStats.uservote===-1?'.selected':''),
        { href: '#', onclick: makeVoteCb(-1), 'data-overlay': (isSelf?'Your Downvotes':(voteStats.uservote===-1?'Undo Downvotes':'Downvote')) },
         h('.corner-inner',com.icon('triangle-bottom'), voteStats.downvoters.length)),
      h('a.profpic', { href: makeUri({ view: 'pics' }) }, com.hexagon(profileImg, 275)))

    // profile title
    var joinDate = (profile) ? u.prettydate(new Date(profile.createdAt), true) : '-'
    var title = h('.title',
      h('h2', name, com.nameConfidence(pid, app)),
      (primary) ?
        h('h3', com.user(app, primary), '\'s feed') :
        '',
      h('p.text-muted', 'joined '+joinDate))

    // totem colors derived from the image
    var tmpImg = document.createElement('img')
    tmpImg.src = profileImg
    tmpImg.onload = function () {
      var rgb = u.getAverageRGB(tmpImg)
      if (rgb) {
        var avg = (rgb.r + rgb.g + rgb.b) / 3
        if (avg > 128) {
          rgb.r = (rgb.r/2)|0
          rgb.g = (rgb.g/2)|0
          rgb.b = (rgb.b/2)|0
          avg = (rgb.r + rgb.g + rgb.b) / 3
        }
        var rgb2 = { r: ((rgb.r/2)|0), g: ((rgb.g/2)|0), b: ((rgb.b/2)|0) }

        try { title.querySelector('h2').style.color = 'rgb('+rgb2.r+','+rgb2.g+','+rgb2.b+')' } catch (e) {}
        try { title.querySelector('h3').style.color = 'rgba('+rgb2.r+','+rgb2.g+','+rgb2.b+', 0.75)' } catch (e) {}
        try { title.querySelector('p').style.color  = 'rgba('+rgb2.r+','+rgb2.g+','+rgb2.b+', 0.75)' } catch (e) {}
        function setColors (el) {
          if (el.classList.contains('selected')) {
            el.style.color = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')'
            el.style.background = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.5)'
          } else {
            el.style.color = 'rgba(255,255,255,0.5)'//(avg < 128) ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
            el.style.background = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')'
          }
        }
        Array.prototype.forEach.call(totem.querySelectorAll('.corner'), setColors)
      }
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
          totem,
          title,
          (voteStats.upvoters.length) ? h('.relations', h('h4', com.icon('triangle-top'), 's'), com.userHexagrid(app, voteStats.upvoters, { nrow: 4 })) : '',
          (voteStats.downvoters.length) ? h('.relations', h('h4', com.icon('triangle-bottom'), 's'), com.userHexagrid(app, voteStats.downvoters, { nrow: 4 })) : ''))))

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
        if (c.type === 'init' || c.type === 'post' || c.type === 'advert' || c.type === 'contact' || c.type === 'pub')
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
      if ((c.type == 'post' || c.type == 'advert') && regex.exec(c.text))
        return true
      return false
    }

    // handlers

    function toggleFollow (e) {
      e.preventDefault()
      if (isSelf) {
        window.location.hash = makeUri({ view: 'pics' })
        return
      }
      app.updateContact(pid, { following: !isFollowing }, function(err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }

    function makeVoteCb (newvote) {
      return function (e) {
        e.preventDefault()
        if (isSelf) {
          window.location.hash = makeUri({ view: 'pics' })
          return
        }
        // :TODO: use msg-schemas
        if (voteStats.uservote === newvote) // toggle behavior
          newvote = 0
        app.ssb.publish({ type: 'vote', voteTopic: { feed: pid }, vote: newvote }, function (err) {
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

    function onsearch (e) {
      e.preventDefault()
      window.location.hash = makeUri({ q: e.target.search.value })
    }

  })
}
module.exports.isHubPage = true
var h = require('hyperscript')
var com = require('./index')
var u = require('../lib/util')

module.exports = function (app, msg, follows) {

  // markup 

  var contactId   = msg.value.author
  var profile     = app.profiles[contactId]
  var name        = com.userName(app, contactId)
  var otherNames  = app.getOtherNames(profile)
  var isSelf      = (contactId == app.myid)
  var isFollowing = follows[app.myid][contactId]

  // secondary feeds (applications)
  var primary
  if (profile && profile.primary) {
    primary = profile.primary
    if (profile.self.name) // use own name
      name = profile.self.name
  }

  var profileImg = com.profilePicUrl(app, contactId)
  var totem = h('.totem',
    h('a.corner.topleft' + (isFollowing?'.selected' : ''),
      {
        href: '#',
        onclick: toggleFollow,
        'data-overlay': (isSelf ? 'Your Followers' : (isFollowing ? 'Unfollow' : 'Follow'))
      }, 
      h('.corner-inner', 0/*:TODO: followers.length*/, com.icon('user'))),
    h('a.corner.botleft' + (0/*:TODO: voteStats.uservote*/===1 ? '.selected' : ''),
      {
        href: '#',
        onclick: makeVoteCb(1),
        'data-overlay': (isSelf ? 'Your Upvotes' : (0/*:TODO: voteStats.uservote*/===1 ? 'Undo Upvote' : 'Upvote'))
      }, 
      h('.corner-inner', 0/*:TODO: voteStats.upvoters.length*/, com.icon('triangle-top'))),
    h('a.corner.botright' + (0/*:TODO: voteStats.uservote*/===-1 ? '.selected' : ''),
      {
        href: '#',
        onclick: makeVoteCb(-1),
        'data-overlay': (isSelf ? 'Your Downvotes' : (0/*:TODO: voteStats.uservote*/===-1 ? 'Undo Downvotes' : 'Downvote'))
      },
       h('.corner-inner',com.icon('triangle-bottom'), 0/*:TODO: voteStats.downvoters.length*/)),
    h('a.profpic', { href: '#/profile/'+contactId }, com.hexagon(profileImg, 275)))


  // profile title
  var joinDate = (profile) ? u.prettydate(new Date(profile.createdAt), true) : '-'
  var title = h('.title',
    h('h2', name, com.nameConfidence(contactId, app)),
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

  return h('.contact-summary', totem, title)

  // handlers
    
  function rename (e, contactId) {
    e.preventDefault()
    app.setNamePrompt(contactId)
  }

  function toggleFollow (e) {
    e.preventDefault()
    if (isSelf) {
      window.location.hash = makeUri({ view: 'pics' })
      return
    }
    app.updateContact(contactId, { following: !isFollowing }, function(err) {
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
      app.ssb.publish({ type: 'vote', voteTopic: { feed: contactId }, vote: newvote }, function (err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }
  }
}
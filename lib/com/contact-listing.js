var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var com = require('./index')
var u = require('../util')
var social = require('../social-graph')

module.exports = function (app, profile, follows, trusts, opts) {

  // markup 

  var id = profile.id
  var isfollowed = follows[app.user.id][profile.id]

  var followbtn
  renderFollow()
  function renderFollow () {
    if (id != app.user.id) {
      var newbtn
      if (!isfollowed)
        newbtn = h('button.btn.btn-3d', { title: 'Follow', onclick: toggleFollow }, com.icon('plus'), ' Follow')
      else
        newbtn = h('button.btn.btn-3d', { title: 'Unfollow', onclick: toggleFollow }, com.icon('minus'), ' Unfollow')
      if (followbtn)
        followbtn.parentNode.replaceChild(newbtn, followbtn)
      followbtn = newbtn
    }
  }

  // gather followers that you follow
  var nfollowers = social.getFollowsByFolloweds(app.user.id, profile.id, follows).length
  var followersSummary
  if (nfollowers === 0)
    followersSummary = 'Not followed by anyone you follow'
  else
    followersSummary = 'Followed by ' + nfollowers + ' user' + (nfollowers==1?'':'s') + ' you follow'

  // gather flaggers that you follow
  var nflaggers = social.getFlagsByFollowedsAndMe(app.user.id, profile.id, follows, trusts).length
  var flaggersSummary
  if (nflaggers !== 0) {
    flaggersSummary = h('span.text-danger',
      { style: 'margin-left: 10px' },
      com.icon('flag'), ' Flagged by ', nflaggers, ' user' + (nflaggers==1?'':'s')
    )
  }

  // render
  var listing = h('.contact-listing',
    h('.profpic', com.userHexagon(app, id, 80)),
    h('.details',
      h('p.name', com.a('#/profile/'+id, app.users.names[id])),
      h('p', followersSummary, flaggersSummary)
    ),
    h('.actions', followbtn)
  )
  listing.dataset.followers = nfollowers
  return listing

  // handlers

  function toggleFollow (e) {
    e.preventDefault()

    // optimistically render
    isfollowed = !isfollowed
    renderFollow()

    // update
    app.ui.pleaseWait(true, 1000)
    schemas.addContact(app.ssb, profile.id, { following: isfollowed }, function (err) {
      app.ui.pleaseWait(false)
      if (err) {
        isfollowed = !isfollowed
        renderFollow() 
        swal('Error While Publishing', err.message, 'error')
      }
    })
  }
}
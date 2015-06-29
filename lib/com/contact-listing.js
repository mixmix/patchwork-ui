var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var com = require('./index')
var u = require('../util')
var social = require('../social-graph')

module.exports = function (app, profile, follows, trusts, opts) {

  // markup 

  var id = profile.id

  function f (e) { follow(e, id) }
  function unf (e) { unfollow(e, id) }

  var followbtn
  if (id != app.user.id) {
    if (!follows[app.user.id][id])
      followbtn = h('button.btn.btn-3d', { title: 'Follow', onclick: f }, com.icon('plus'), ' Follow')
    else
      followbtn = h('button.btn.btn-3d.unfollow', { title: 'Unfollow', onclick: unf }, com.icon('minus'), ' Unfollow')
  }

  // gather followers that you follow
  var nfollowers = social.getFollowsByFollowers(app.user.id, profile.id, follows).length
  var followersSummary
  if (nfollowers === 0)
    followersSummary = h('span.text-danger', 'Not followed by anyone you follow')
  else
    followersSummary = 'Followed by ' + nfollowers + ' user' + (nfollowers==1?'':'s') + ' you follow'

  // gather flaggers that you follow
  var nflaggers = social.getFlagsByFollowers(app.user.id, profile.id, follows, trusts).length
  var flaggersSummary
  if (nflaggers !== 0) {
    flaggersSummary = h('span.text-danger',
      { style: 'margin-left: 10px' },
      com.icon('flag'), ' Flagged by ', nflaggers, ' user' + (nflaggers==1?'':'s') + ' you follow!'
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

  function follow (e, pid) {
    e.preventDefault()
    if (!follows[app.user.id][pid]) {
      app.ui.pleaseWait(true, 500)
      schemas.addContact(app.ssb, pid, { following: true }, function(err) {
        app.ui.pleaseWait(false)
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }
  }

  function unfollow (e, pid) {
    e.preventDefault()
    if (follows[app.user.id][pid]) {
      app.ui.pleaseWait(true, 500)
      schemas.addContact(app.ssb, pid, { following: false }, function(err) {
        app.ui.pleaseWait(false)
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }
  }
}
var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var com = require('./index')
var u = require('../util')

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
  var followers = 0
  for (var otherid in follows) {
    if (follows[otherid][profile.id] && (follows[app.user.id][otherid] || otherid == app.user.id))
      followers++
  }
  var followersSummary
  if (followers === 0) {
    if (id === app.user.id)
      followersSummary = 'No followers... yet!'
    else
      followersSummary = h('span.text-danger', 'Not followed by anyone you follow')
  } else
    followersSummary = 'Followed by ' + followers + ' user' + (followers==1?'':'s') + ' you follow'

  // gather flaggers that you follow
  var flaggers = 0
  for (var otherid in trusts) {
    if (trusts[otherid] && trusts[otherid][profile.id] == -1 && (follows[app.user.id][otherid] || otherid == app.user.id))
      flaggers++
  }
  var flaggersSummary
  if (flaggers !== 0) {
    flaggersSummary = h('span.text-danger',
      { style: 'margin-left: 10px' },
      com.icon('flag'), ' Flagged by ', flaggers, ' user' + (flaggers==1?'':'s') + ' you follow!'
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
      // h('p.followers', followers)),
    // (flaggers.length) ?
      // h('.flaggers', flaggers, ' Flagged this user!') :
      // '')
  listing.dataset.followers = followers
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
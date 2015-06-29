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
      followbtn = h('button.btn.btn-primary', { title: 'Follow', onclick: f }, com.icon('plus'), ' Follow')
    else
      followbtn = h('button.btn.btn-primary.unfollow', { title: 'Unfollow', onclick: unf }, com.icon('minus'), ' Unfollow')
  }

  // gather followers
  var followers = []
  for (var otherid in follows) {
    if (follows[otherid][profile.id] && (follows[app.user.id][otherid] || otherid == app.user.id))
      followers.push(com.userImg(app, otherid))
  }
  var flen = followers.length
  if (flen > 16)
    followers = followers.slice(0, 16).concat(h('a', { href: '#/profile/'+id }, ' + ' + (flen-16) + ' others'))
  if (flen == 0) {
    if (id === app.user.id)
      followers = 'No followers... yet!'
    else
      followers = h('.text-danger', 'No mutual followers')
  }

  // gather flaggers
  var flaggers = []
  for (var otherid in trusts) {
    if (trusts[otherid] && trusts[otherid][profile.id] == -1 && (follows[app.user.id][otherid] || otherid == app.user.id))
      flaggers.push(com.userImg(app, otherid))
  }

  // render
  var listing = h('.contact-listing',
    h('.profpic',
      com.userHexagon(app, id, 80),
      h('.action', followbtn)),
    h('.details',
      h('p.name', com.a('#/profile/'+id, app.users.names[id])),
      h('p.followers', followers)),
    (flaggers.length) ?
      h('.flaggers', flaggers, ' Flagged this user!') :
      '')
  listing.dataset.followers = flen
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
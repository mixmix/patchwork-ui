var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var com = require('./index')
var u = require('../lib/util')

module.exports = function (app, profile, follows, opts) {

  // markup 

  var id = profile.id

  function f (e) { follow(e, id) }
  function unf (e) { unfollow(e, id) }
  function r (e) { rename(e, id) }

  var followbtn, renamebtn
  if (id === app.user.id) {
    followbtn = h('span.text-muted.pull-right', { style: 'padding-right: 1em' }, 'you!')
  } else {
    if (!follows[app.user.id][id])
      followbtn = h('button.btn.btn-primary', { title: 'Follow', onclick: f }, com.icon('plus'), ' Follow')
    else
      followbtn = h('button.btn.btn-primary', { title: 'Unfollow', onclick: unf }, com.icon('minus'), ' Unfollow')
  }
  renamebtn = h('button.btn.btn-primary.btn-xs', { title: 'Rename', onclick: r }, com.icon('pencil'))

  var followers = []
  for (var otherid in follows) {
    if (follows[otherid][profile.id] && (follows[app.user.id][otherid] || otherid == app.user.id))
      followers.push(com.userImg(app, otherid))
  }
  var flen = followers.length
  if (flen > 15)
    followers = followers.slice(0, 15).concat(h('a', { href: '#/profile/'+id }, ' + ' + (flen-15) + ' others'))
  if (flen == 0)
    followers = h('.text-danger', 'No mutual followers')

  var listing = h('tr.contact-listing',
    h('td.profpic', com.userHexagon(app, id, 80)),
    ((opts && opts.syncspinner) ? h('td', (!profile.self.name) ? h('.spinner.inline.small', h('.cube1'), h('.cube2')) : '') : ''),
    h('td.details',
      h('p.name', com.a('#/profile/'+id, app.users.names[id]||u.shortString(id, 20))),
      h('p.followers', followers)),
    h('td.actions', followbtn))
  listing.dataset.followers = flen
  return listing

  // handlers
    
  function rename (e, pid) {
    e.preventDefault()
    app.ui.setNamePrompt(pid)
  }

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
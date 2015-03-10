var h = require('hyperscript')
var com = require('./index')
var u = require('../lib/util')

module.exports = function (app, msg, profiles, follows) {

  // markup 

  var id = msg.value.author
  var profile = profiles[id]
  var otherNames = app.getOtherNames(profile)

  var profileImg = '/img/default-prof-pic.png'
  if (profile) {
    if (profile.assignedBy[app.myid] && profile.assignedBy[app.myid].profilePic)
      profileImg = '/ext/' + profile.assignedBy[app.myid].profilePic.ext
    else if (profile.self.profilePic)
      profileImg = '/ext/' + profile.self.profilePic.ext
  }

  function f (e) { follow(e, id) }
  function unf (e) { unfollow(e, id) }
  function r (e) { rename(e, id) }

  var followbtn, renamebtn
  if (id === app.myid) {
    followbtn = h('span.text-muted', 'you!')
  } else {
    if (!follows[app.myid][id])
      followbtn = h('button.btn.btn-primary', { title: 'Follow', onclick: f }, com.icon('plus'))
    else
      followbtn = h('button.btn.btn-primary', { title: 'Unfollow', onclick: unf }, com.icon('minus'))
  }
  renamebtn = h('button.btn.btn-primary.btn-xs', { title: 'Rename', onclick: r }, com.icon('pencil'))

  return h('tr.address',
    h('td.profpic', com.a('#/profile/'+id, h('img', { src: profileImg }))),
    h('td.details',
      h('p.name', 
        h('strong', com.a('#/profile/'+id, u.shortString(app.names[id]||id, 20)), com.nameConfidence(id, app), ' ', renamebtn)),
      h('p',
        (otherNames.length)
          ? h('small.text-muted', 'aka ', otherNames.join(', '))
          : '')),
    h('td.actions', followbtn))

  // handlers
    
  function rename (e, pid) {
    e.preventDefault()
    app.setNamePrompt(pid)
  }

  function follow (e, pid) {
    e.preventDefault()
    if (!follows[app.myid][pid]) {
      app.updateContact(pid, { following: true }, function(err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }
  }

  function unfollow (e, pid) {
    e.preventDefault()
    if (follows[app.myid][pid]) {
      app.updateContact(pid, { following: false }, function(err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }
  }
}
var h = require('hyperscript')
var com = require('./index')
var u = require('../lib/util')

module.exports = function (app, profiles, follows) {
  return function (msg) {

    var id = msg.value.author
    var profile = profiles[id]
    var otherNames = app.getOtherNames(profile)

    function f (e) { follow(e, id) }
    function unf (e) { unfollow(e, id) }

    var followbtn, renameBtn, blockBtn
    if (id === app.myid) {
      followbtn = h('span.text-muted', 'you!')
    } else {
      if (!follows[app.myid][id])
        followbtn = h('button.btn.btn-primary', { title: 'Add Contact', onclick: f }, com.icon('plus'))
      else
        followbtn = h('button.btn.btn-primary', { title: 'Remove Contact', onclick: unf }, com.icon('minus'))
    }
    // renameBtn = h('button.btn.btn-primary', { title: 'Rename', onclick: r }, com.icon('pencil'), ' Rename')

    return h('tr.address',
      h('td.profpic', com.a('#/profile/'+id, h('img', { src: '/img/default-prof-pic.png' }))),
      h('td.details',
        h('p.name', 
          h('strong', com.a('#/profile/'+id, u.shortString(app.names[id]||id, 20)), com.nameConfidence(id, app))),
        h('p',
          (otherNames.length)
            ? h('small.text-muted', 'aka ', otherNames.join(', '))
            : '')),
      h('td.actions', followbtn))
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
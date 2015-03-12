var h = require('hyperscript')
var com = require('./index')

module.exports = function (app) {

  // markup

  var notes = []
  for (var k in app.actionItems) {
    var item = app.actionItems[k]
    if (item.action == 'confirm-app') {
      notes.push(h('.note.well', 
        h('p', com.user(app, item.subid), ' claims it\'s your application. Alias it to your account?'),
        h('div', 
          h('button.btn.btn-success.btn-strong', { onclick: confirmApp(item) }, com.icon('ok'), ' Confirm'),
          ' ',
          h('button.btn.btn-danger.btn-strong', { onclick: denyApp(item) }, com.icon('remove'), ' Deny and Flag'))))
    }
  }

  return h('.notifications', notes)

  // handlers

  function confirmApp (item) {
    return function (e) {
      e.preventDefault()

      var contact = {}
      if (app.names[item.subid])
        contact.name = app.names[item.subid]
      contact.master = { feed: app.myid }
      contact.following = true

      app.updateContact(item.subid, contact, function (err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }
  }

  function denyApp (item) {
    return function (e) {
      e.preventDefault()
      app.updateContact(item.subid, { master: false, trust: -1 }, function (err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }
  }
}
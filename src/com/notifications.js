var h = require('hyperscript')
var com = require('./index')

module.exports = function (app) {

  // markup

  var notes = []
  for (var k in app.actionItems) {
    var item = app.actionItems[k]
    if (item.action == 'confirm-app') {
      notes.push(h('.note.well', 
        h('p', com.user(app, item.feedid), ' claims it\'s your application. Alias it to your account?'),
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
      var contact = { myapp: true, following: true }
      if (app.names[item.feedid])
        contact.name = app.names[item.feedid]
      app.updateContact(item.feedid, contact, function (err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }
  }

  function denyApp (item) {
    return function (e) {
      e.preventDefault()
      app.updateContact(item.feedid, { myapp: false, trust: -1 }, function (err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else app.refreshPage()
      })
    }
  }
}
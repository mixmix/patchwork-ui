var h = require('hyperscript')
var com = require('./index')

module.exports = function (app) {

  // markup

  var notes = []
  for (var k in app.ui.actionItems) {
    var item = app.ui.actionItems[k]
    if (item.type == 'name-conflict') {
      notes.push(h('.note.warning', 
        h('h3', 'Heads up!'),
        h('p', 'You are following more than one user named "'+item.name+'." You need to rename one of them to avoid confusion.'),
        h('ul.list-inline', item.ids.map(function (id) { return h('li', com.userImg(app, id), ' ', com.user(app, id)) }))
      ))
    }
  }

  return (notes.length) ? h('.notifications', notes) : null
}
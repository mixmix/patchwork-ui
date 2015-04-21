var h = require('hyperscript')
var com = require('./index')

module.exports = function (app, opts) {
  opts = opts || {}

  // markup

  var nameInput = h('input.form-control', { placeholder: 'Name' })
  var nav = h('.editor-nav',
    com.nav({
      current: 'code',
      items: [
        ['code', ontab, 'Code'],
        ['help', ontab, 'Help']
      ]
    }),
    h('.editor-nav-body', 'todo'))

  // handlers

  var ontab = '' // :TODO:

  return nav
}
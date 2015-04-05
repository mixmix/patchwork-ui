var h = require('hyperscript')
var buffers = require('ls-buffers')
var com = require('./index')

module.exports = function (app, opts) {
  opts = opts || {}

  // markup

  var nameInput = h('input.form-control', { placeholder: 'Name' })
  var nav = h('.editor-nav',
    com.nav({
      current: 'file',
      items: [
        ['file',   ontab, 'File'],
        ['help',   ontab, 'Help']
      ]
    }),
    h('.editor-nav-body',
      h('p', nameInput)))
      // h('p', 
        // h('a.btn.btn-primary', com.icon('play')),
        // h('a.btn.btn-warning', com.icon('stop'))),
      // h('p.checkbox',
        // h('label', h('input', { type: 'checkbox' }), 'Eval on page load'))))

  // handlers

  var ontab = '' // :TODO:

  // apis

  nav.getName = function () {
    return nameInput.value
  }
  nav.setName = function (v) {
    nameInput.value = v
  }

  return nav
}
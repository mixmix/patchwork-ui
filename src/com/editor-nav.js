var h = require('hyperscript')
var com = require('./index')

module.exports = function (app, opts) {
  opts = opts || {}

  // markup

  return h('.editor-nav',
    com.nav({
      current: 'file',
      items: [
        ['file',   ontab, 'File'],
        ['files',  ontab, 'Files'],
        ['help',   ontab, 'Help']
      ]
    }),
    h('.editor-nav-body',
      h('p', h('input.form-control', { placeholder: 'Name' }))))
      // h('p', 
        // h('a.btn.btn-primary', com.icon('play')),
        // h('a.btn.btn-warning', com.icon('stop'))),
      // h('p.checkbox',
        // h('label', h('input', { type: 'checkbox' }), 'Eval on page load'))))

  // handlers

  var ontab = '' // :TODO:
}
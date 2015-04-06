var h = require('hyperscript')
var buffers = require('ls-buffers')
var com = require('./index')

module.exports = function (app, opts) {
  opts = opts || {}

  // markup

  var buflist = buffers.list()
  var buflinks = []
  for (var id in buflist) {
    var selected = (opts.selectedBuff == id) ? '.selected' : ''
    buflinks.push(h('li'+selected, h('a', { href: '#/program-editor/'+id }, buflist[id].name)))
  }

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
      h('p', h('a.btn.btn-default.btn-xs', { href: '#/program-editor' }, 'New')),
      // h('p', nameInput),
      h('ul.buffer-list', buflinks)))

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
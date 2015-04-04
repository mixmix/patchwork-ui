'use strict'
var h = require('hyperscript')
var CodeMirror = require('codemirror')
require('codemirror/mode/javascript/javascript')
require('codemirror/keymap/sublime')
var com = require('../com')
var u = require('../lib/util')

module.exports = function (app) {

  // markup

  var edContainer = h('.editor-container',
    h('.editor-ctrls',
      h('a', { href: '#/program-editor' }, 'Save'),
      h('a', 'Eval')))

  app.setPage('new-program', h('.row',
    h('.col-xs-1', com.sidenav(app)),
    h('.col-xs-8', edContainer),
    h('.col-xs-3.right-column.full-height',
      h('.right-column-inner', com.notifications(app)),
      com.sidehelp(app))
  ))

  // post-render decoration

  var editor = CodeMirror(function (el) {
    el.classList.add('full-height')
    edContainer.appendChild(el)
    el.style.height = (window.innerHeight - el.offsetTop) + 'px'
  }, {
    mode: 'javascript',
    theme: 'monokai',
    keyMap: 'sublime',
    indentUnit: 2,
    smartIndent: true,
    tabSize: 2,
    indentWithTabs: false,
    electricChars: true,
    lineWrapping: false,
    lineNumbers: true
  })

  // handlers

}

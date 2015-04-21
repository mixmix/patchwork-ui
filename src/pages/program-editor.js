'use strict'
var h = require('hyperscript')
var CodeMirror = require('codemirror')
require('codemirror/mode/javascript/javascript')
require('codemirror/keymap/sublime')
var com = require('../com')
var u = require('../lib/util')

module.exports = function (app) {

  var hasChanges = false
  var path = app.page.param
  var text = ''
  if (path) {
    var v = lookup(window.program, path.split('.'))
    if (v)
      text = v.toString()
  }

  // markup

  var saveBtn = h('a.blue', { href: '#', onclick: onsave }, 'Save')
  var edContainer = h('.editor-container', h('.editor-ctrls', saveBtn))
  var editorNav = com.editorNav(app)
  app.setPage('program-editor', h('.row',
    h('.col-xs-1', com.sidenav(app)),
    h('.col-xs-8', edContainer),
    h('.col-xs-3.right-column.full-height',
      h('.right-column-inner', com.notifications(app)),
      editorNav,
      com.sidehelp(app))
  ))

  // post-render decoration

  var editor = CodeMirror(function (el) {
    el.classList.add('full-height')
    edContainer.appendChild(el)
    el.style.height = (window.innerHeight - el.offsetTop) + 'px'
  }, {
    value: text,
    mode: 'javascript',
    theme: 'default',
    keyMap: 'sublime',
    indentUnit: 2,
    smartIndent: true,
    tabSize: 2,
    indentWithTabs: false,
    electricChars: true,
    lineWrapping: false,
    lineNumbers: true
  })

  var lastGen
  editor.on('change', function () {
    var hadChanges = hasChanges
    hasChanges = !editor.isClean(lastGen)
    if (hadChanges !== hasChanges) {
      if (hasChanges)
        saveBtn.classList.add('highlighted')
      else
        saveBtn.classList.remove('highlighted')
    }
  })

  // handlers

  function onsave (e) {
    e.preventDefault()

    var text = editor.getValue()
    // :TODO: save
    lastGen = editor.changeGeneration()

    hasChanges = false
    saveBtn.classList.remove('highlighted')
  }
}

function lookup (obj, path) {
  var k = path.shift()
  var v = obj[k]
  if (path.length)
    return lookup(v, path)
  return v
}

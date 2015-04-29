'use strict'
var h = require('hyperscript')
var buffers = require('ls-buffers')
var CodeMirror = require('codemirror')
require('codemirror/mode/javascript/javascript')
require('codemirror/keymap/sublime')
var com = require('../com')
var u = require('../lib/util')

module.exports = function (app) {

  var hasChanges = false
  var buff = buffers.load(app.page.param) || {id: null, meta:{}, text:''}

  // markup

  var saveBtn = h('a.blue', { href: '#', onclick: onsave }, 'Save')
  var edContainer = h('.editor-container',
    h('.editor-ctrls',
      saveBtn,
      h('a.yellow', { href: '#/program-editor' }, 'Eval')))
  var editorNav = com.editorNav(app, { selectedBuff: buff.id })
  app.setPage('new-program', h('.row',
    h('.col-xs-1', com.sidenav(app)),
    h('.col-xs-8', edContainer),
    h('.col-xs-3.right-column',
      h('.right-column-inner', com.notifications(app)),
      editorNav,
      com.sidehelp(app))
  ))

  // post-render decoration

  editorNav.setName(buff.meta.name || '')
  var editor = CodeMirror(function (el) {
    el.classList.add('full-height')
    edContainer.appendChild(el)
    el.style.height = (window.innerHeight - el.offsetTop) + 'px'
  }, {
    value: buff.text,
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

    console.log(editorNav.getName())
    buff.meta.name = editorNav.getName()
    buff.text = editor.getValue()
    buffers.save(buff)
    lastGen = editor.changeGeneration()

    if (app.page.param != buff.id)
      window.location = '#/program-editor/'+buff.id

    editorNav.setName(buff.meta.name)
    hasChanges = false
    saveBtn.classList.remove('highlighted')
  }
}

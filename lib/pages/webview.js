'use strict'
var h = require('hyperscript')
var o = require('observable')
var com = require('../com')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var isref = require('ssb-ref')
var mlib = require('ssb-msgs')
var pull     = require('pull-stream')
var remote = require('remote')
var fs = remote.require('fs')
var dialog = remote.require('dialog')

module.exports = function () {
  var param = app.page.param
  var port = (isref.isHash(param)) ? 7777 : 7778
  var url = 'http://localhost:' + port + '/' + param

  // fetch any linked messages
  var msgs
  pull(
    app.ssb.links({ keys: true, values: true, dest: app.page.param }),
    pull.collect(function (err, _msgs) {
      msgs = _msgs||[]
      msgs.sort(function (a, b) {
        return b.value.timestamp - a.value.timestamp
      })
      commentFeed.appendChild(com.messageFeed({ 
        feed: function () { return pull.values(msgs) },
        onefetch: true
      }))
    })
  )

  // markup

  var commentFeed = h('div')
  var webview = com.webview({ url: url })
  ui.setPage('webview', h('.layout-grid',
    h('.layout-grid-col.webview-left', webview),
    (isref.isHash(param)) ?
      h('.layout-grid-col.webview-right.comments', { style: showhide(app.observ.commentsPanel) }, commentFeed) :
      '',
    h('.layout-grid-col.webview-right.editor', { style: showhide(app.observ.editorPanel) }, editor())
  ), { onPageTeardown: function () { window.removeEventListener('resize', resize) }})

  function showhide (input) {
    return { display: o.transform(input, function (v) { return (v) ? 'block' : 'none' }) }
  }

  // dynamically size various controls
  resize()
  window.addEventListener('resize', resize)
  function resize () {
    [
      [webview.querySelector('::shadow object'), 4],
      [document.querySelector('.webview-page .webview-left'), 2],
      [document.querySelector('.webview-page .comments'), 4],
      [document.querySelector('.webview-page .editor'), 2],
      [document.querySelector('.webview-page .editor textarea'), 36]
    ].forEach(function (entry) {
      if (entry[0])
        entry[0].style.height = (window.innerHeight - 42 - entry[1]) + 'px'
    })
  }

  // panels

  function editor () {

    // markup

    var lastSavedValue
    var textarea = h('textarea', { onkeyup: onkeyup })
    var savebtn = h('a.btn.btn-3d', { onclick: onsave }, 'Save')
    var publishbtn = h('a.btn.btn-3d', { onclick: onpublish }, 'Publish')
    var editor = [
      h('.editor-toolbar',
        (isref.isHash(app.page.param)) ?
          [
            h('a.btn.btn-3d', { onclick: onsaveas }, 'Fork this File...'),
            h('.pull-right.text-muted', { style: 'padding: 5px 10px' }, 'Readonly')
          ] :
          [
            savebtn,
            ' ', h('a.btn.btn-3d', { onclick: onsaveas }, 'Save As...'),
            ' ', publishbtn
          ]
      ),
      textarea
    ]
    if (isref.isHash(app.page.param))
      textarea.setAttribute('readonly', 'readonly')

    var be = new Behave({
      textarea: textarea,
      replaceTab: true,
      softTabs: true,
      tabSize: 2,
      autoOpen: false,
      overwrite: false,
      autoStrip: false,
      autoIndent: true,
      fence: false
    })


    // fetch from the server
    var xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.responseType = 'text'
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4)
        lastSavedValue = textarea.textContent = xhr.responseText
    }
    xhr.send()

    // handlers

    savebtn.setAttribute('disabled', true)
    function onkeyup () {
      if (textarea.value != lastSavedValue) {
        savebtn.removeAttribute('disabled')
        publishbtn.setAttribute('disabled', true)
      } else {
        publishbtn.removeAttribute('disabled')
        savebtn.setAttribute('disabled', true)
      }
    }

    function onsave () {
      fs.writeFile(app.page.param, textarea.value, { encoding: 'utf8' }, function (err) {
        if (err) {
          console.error(err)
          alert('Error: '+err.toString())
        } else {
          lastSavedValue = textarea.value
          savebtn.setAttribute('disabled', true)
          publishbtn.removeAttribute('disabled')
          webview.reload()
        }
      })
    }

    function onsaveas () {
      var defaultPath = (isref.isHash(app.page.param)) ? undefined : app.page.param
      var path = dialog.showSaveDialog(remote.getCurrentWindow(), { defaultPath: defaultPath })
      if (path) {
        fs.writeFile(path, textarea.value, { encoding: 'utf8' }, function (err) {
          if (err) {
            console.error(err)
            alert('Error: '+err.toString())
          } else
            window.location.hash = '#/webview/'+path
        })
      }
    }

    function onpublish () {
      var attachments = [{
        path: app.page.param,
        name: app.page.param.split('/').pop(),
        size: textarea.value.length
      }]

      // create modal
      modals.post(null, {
        placeholder: 'Publish this file on your feed',
        attachments: attachments,
        onpost: function (msg) {
          ui.notice('success', 'Published!', 3e3)
          window.location.hash = '#/webview/'+msg.value.content.attachments[0].link
        }
      })
    }

    return editor
  }
}

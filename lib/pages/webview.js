'use strict'
var h = require('hyperscript')
var com = require('../com')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var isref = require('ssb-ref')
var mlib = require('ssb-msgs')
var muxrpc = require('muxrpc')
var pull     = require('pull-stream')
var pushable = require('pull-pushable')
var remote = require('remote')
var fs = remote.require('fs')
var dialog = remote.require('dialog')

module.exports = function () {
  var param = app.page.param
  var url = 'http://localhost:' + ((isref.isHash(param)) ? 7777 : 7778) + '/' + param

  // fetch any linked messages
  var msgs
  pull(
    app.ssb.links({ keys: true, values: true, dest: app.page.param, type: 'ext' }),
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
  var webview = h('webview', { src: url, preload: './webview-preload.js' })
  ui.setPage('webview', h('.layout-grid',
    h('.layout-grid-col.webview-left', webview),
    h('.layout-grid-col.webview-right.comments.hide',
      h('.comments-toolbar',
        h('a.btn.btn-3d', { onclick: oncomment }, 'Share this File...')
      ),
      commentFeed
    ),
    h('.layout-grid-col.webview-right.editor.hide', editor())
  ), { onPageTeardown: function () { window.removeEventListener('resize', resize) }})
  setupRpc(webview)

  // dynamically size the webview
  resize()
  window.addEventListener('resize', resize)
  function resize () {
    [
      [webview.querySelector('::shadow object'), 0],
      [document.querySelector('.webview-page .comments'), 0],
      [document.querySelector('.webview-page .editor textarea'), 0]
    ].forEach(function (entry) {
      entry[0].style.height = (window.innerHeight - entry[0].offsetTop - entry[1]) + 'px'
    })
  }

  // handlers

  function oncomment () {
    // try to find some good links to reuse
    var attachments
    for (var i=msgs.length-1; i >= 0; i--) {
      attachments = mlib.links(msgs[i].value.content.attachments, 'ext')
      if (attachments) {
        if (attachments.filter(function (a) { return a.ext == app.page.param }).length)
          break
        attachments = undefined
      }
    }
    if (!attachments)
      attachments = [{ name: 'untitled', ext: app.page.param }]

    // create modal
    modals.post(null, {
      placeholder: 'Share this file on your feed',
      attachments: attachments,
      onpost: function (msg) {
        var el = commentFeed.querySelector('.message-feed')
        el.insertBefore(com.message(msg), el.firstChild)
      }
    })
  }

  // panels

  function editor () {

    // markup

    var lastSavedValue
    var textarea = h('textarea', { onkeyup: onkeyup })
    var savebtn = h('a.btn.btn-3d', { onclick: onsave }, 'Save')
    var publishbtn = h('a.btn.btn-3d.pull-right', { onclick: onpublish }, 'Publish')
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
            publishbtn
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
          window.location.hash = '#/webview/'+msg.value.content.attachments[0].ext
        }
      })
    }

    return editor
  }
}

var manifest = {
  'get'              : 'async',
  'getPublicKey'     : 'async',
  'whoami'           : 'async',
  'relatedMessages'  : 'async',
  'createFeedStream' : 'source',
  'createUserStream' : 'source',
  'createLogStream'  : 'source',
  'messagesByType'   : 'source',
  'links'            : 'source'
}

function setupRpc (webview) {
  var ssb = muxrpc(null, manifest, serialize)(app.ssb)
  function serialize (stream) { return stream }

  var rpcStream = ssb.createStream()
  var ipcPush = pushable()
  webview.addEventListener('ipc-message', function (e) {
    var msg = e.args[0]
    try {
      if (typeof msg == 'string')
        msg = JSON.parse(msg)
    } catch (e) {
      return
    }
    ipcPush.push(msg)
  })
  pull(ipcPush, rpcStream, pull.drain(
    function (msg) { webview.send('muxrpc-ssb', JSON.stringify(msg)) },
    function (err) { if (err) { console.error(err) } }
  ))
}
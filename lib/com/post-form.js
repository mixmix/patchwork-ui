'use strict'
var h = require('hyperscript')
var suggestBox = require('suggest-box')
var schemas = require('ssb-msg-schemas')
var refs = require('ssb-ref')
var createHash = require('multiblob/util').createHash
var pull = require('pull-stream')
var pushable = require('pull-pushable')
var app = require('../app')
var ui = require('../ui')
var com = require('./index')
var util = require('../util')
var markdown = require('../markdown')
var mentionslib = require('../mentions')

module.exports = function (parent, opts) {

  var namesList = {} // a name->name map for the previews
  for (var id in app.users.names)
    namesList[app.users.names[id]] = app.users.names[id]
  var placeholder = (opts && opts.placeholder) ? opts.placeholder : ('Write your ' + (!parent ? 'status' : 'comment'))

  // markup

  var previewEl = h('.post-form-preview')
  var filesInput = h('input.hidden', { type: 'file', multiple: true, onchange: filesAdded })  
  var textarea = h('textarea', {
    name: 'text',
    placeholder: placeholder,
    value: (opts && opts.initval) ? opts.initval : '',
    rows: ((opts && opts.rows) ? opts.rows : 6),
    onkeyup: onPostTextChange
  })
  var postBtn = h('button.postbtn.btn', { disabled: true }, 'Publish')
  suggestBox(textarea, app.suggestOptions)

  var form = h('form.post-form' + ((!!parent) ? '.reply-form' : ''), { onsubmit: post },
    (!opts || !opts.noheader) ? h('small.text-muted', 'Public post. Markdown, @-mentions, and emojis are supported. ', h('a', { href: '#', onclick: cancel }, 'Cancel')) : '',
    h('.post-form-textarea', textarea),
    previewEl,
    h('.post-form-attachments',
      h('a', { href: '#', onclick: addFile }, 'Click here to add an attachment'),
      postBtn,
      filesInput
    )
  )

  function disable () {
    postBtn.setAttribute('disabled', true)
  }

  function enable () {
    postBtn.removeAttribute('disabled')
  }

  // handlers

  function onPostTextChange () {
    previewEl.innerHTML = (!!textarea.value) ? mentionslib.preview(markdown.block(textarea.value), namesList) : ''
    if (textarea.value.trim())
      enable()
    else
      disable()
  }

  function post (e) {
    e.preventDefault()

    var text = textarea.value
    if (!text.trim())
      return

    disable()
    ui.pleaseWait(true)

    // abort if the parent wasnt decrypted
    if (parent && typeof parent.value.content == 'string') {
      ui.pleaseWait(false)
      ui.notice('danger', 'Unable to decrypt parent message')
      enable()
      return 
    }

    // prep text
    mentionslib.extract(text, function (err, mentions) {
      if (err) {
        ui.setStatus(null)
        ui.pleaseWait(false)
        enable()
        if (err.conflict)
          swal('Error While Publishing', 'You follow multiple people with the name "'+err.name+'." Go to the homepage to resolve this before publishing.', 'error')
        else
          swal('Error While Publishing', err.message, 'error')
        return
      }

      // get encryption recipients from parent
      var recps
      try {
        if (Array.isArray(parent.value.content.recps)) {
          recps = parent.value.content.recps
            .map(function (recp) { return recp.feed })
            .filter(Boolean)
        }
      } catch (e) {}

      // post
      var post = schemas.schemas.post(text)
      if (parent)          post.repliesTo = { msg: parent.key }
      if (mentions.length) post.mentions = mentions
      if (extLinks.length) post.attachments = extLinks
      if (recps)
        app.ssb.publishBoxed(post, recps, published)
      else
        app.ssb.publish(post, published)

      function published (err, msg) {
        ui.setStatus(null)
        enable()
        ui.pleaseWait(false)
        if (err) swal('Error While Publishing', err.message, 'error')
        else {
          app.ssb.phoenix.subscribe(msg.key)
          app.ssb.phoenix.markRead(msg.key)
          opts && opts.onpost && opts.onpost(msg)
        }
      }
    })
  }

  function cancel (e) {
    e.preventDefault()

    if (textarea.value && !confirm('Are you sure you want to cancel? Your message will be lost.'))
      return

    form.parentNode.removeChild(form)
    opts && opts.oncancel && opts.oncancel()
  }

  function addFile (e) {
    e.preventDefault()
    filesInput.click() // trigger file-selector
  }

  function filesAdded (e) {
    // hash the files
    var n = filesInput.files.length
    ui.setStatus('info', 'Hashing ('+n+' files left)...')
    for (var i=0; i < n; i++) {
      if (!add(filesInput.files[i])) {
        ui.setStatus(false)
        return 
      }
    }

    function add (f) {
      if (f.size > 5 * (1024*1024)) {
        var inMB = Math.round(f.size / (1024*1024) * 100) / 100
        swal('Error Attaching File', f.name + ' is larger than the 5 megabyte limit (' + inMB + ' MB)', 'error')
        return false
      }
      console.log('adding', f.path)
      app.ssb.phoenix.addFileToBlobs(f.path, function (err, hash) {
        console.log('added', f.path, hash, n)
        if (err) {
          console.error(err)
          swal('Error Attaching File', 'Error with ' + f.name + ': ' + err.message, 'error')
        } else {
          if (!(/(^|\s)$/.test(textarea.value)))
            textarea.value += ' '
          textarea.value += '['+(f.name||'untitled')+']('+hash+')'
          onPostTextChange()
          if (--n === 0)
            ui.setStatus(false)
        }
      })
      return true
    }
  }

  return form
}
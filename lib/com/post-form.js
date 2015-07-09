'use strict'
var h = require('hyperscript')
var suggestBox = require('suggest-box')
var schemas = require('ssb-msg-schemas')
var refs = require('ssb-ref')
var createHash = require('multiblob/util').createHash
var pull = require('pull-stream')
var pushable = require('pull-pushable')
var com = require('./index')
var util = require('../util')
var markdown = require('../markdown')
var mentionslib = require('../mentions')

module.exports = function (app, parent, opts) {

  var attachments = []
  var namesList = {} // a name->name map for the previews
  for (var id in app.users.names)
    namesList[app.users.names[id]] = app.users.names[id]
  var placeholder = (opts && opts.placeholder) ? opts.placeholder : ('Write your ' + (!parent ? 'status' : 'comment'))

  // markup

  var previewEl = h('.post-form-preview')
  var filesInput = h('input.hidden', { type: 'file', multiple: true, onchange: filesAdded })  
  var filesListEl = h('ul')
  var textarea = h('textarea', {
    name: 'text',
    placeholder: placeholder,
    value: (opts && opts.initval) ? opts.initval : '',
    rows: ((opts && opts.rows) ? opts.rows : 6),
    onkeyup: onPostTextChange
  })
  var postBtn = h('button.postbtn.btn', { disabled: true }, 'Publish')
  suggestBox(textarea, app.ui.suggestOptions)

  var attachmentsEl
  if (parent) {
    attachmentsEl = h('.post-form-attachments', postBtn)
  } else {
    attachmentsEl = h('.post-form-attachments',
      filesListEl,
      h('a', { href: '#', onclick: addFile }, 'Click here to add an attachment'),
      postBtn,
      filesInput
    )
  }

  var form = h('form.post-form' + ((!!parent) ? '.reply-form' : ''), { onsubmit: post },
    (!opts || !opts.noheader) ? h('small.text-muted', 'Public post. Markdown, @-mentions, and emojis are supported. ', h('a', { href: '#', onclick: cancel }, 'Cancel')) : '',
    h('.post-form-textarea', textarea),
    previewEl,
    attachmentsEl
  )

  function disable () {
    postBtn.setAttribute('disabled', true)
  }

  function enable () {
    postBtn.removeAttribute('disabled')
  }

  // handlers

  function onPostTextChange (e) {
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
    app.ui.pleaseWait(true)
    uploadFiles(function (err, extLinks) {
      if (err)
        return app.ui.pleaseWait(false), enable(), swal('Error Uploading Attachments', err.message, 'error')
      app.ui.setStatus('info', 'Publishing...')

      // abort if the parent wasnt decrypted
      if (typeof parent.value.content == 'string') {
        app.ui.pleaseWait(false)
        app.ui.notice('danger', 'Unable to decrypt parent message')
        enable()
        return 
      }

      // prep text
      mentionslib.extract(app, text, function (err, mentions) {
        if (err) {
          app.ui.setStatus(null)
          app.ui.pleaseWait(false)
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
          app.ui.setStatus(null)
          enable()
          app.ui.pleaseWait(false)
          if (err) swal('Error While Publishing', err.message, 'error')
          else {
            app.ssb.phoenix.subscribe(msg.key)
            app.ssb.phoenix.markRead(msg.key)
            opts && opts.onpost && opts.onpost(msg)
          }
        }
      })
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

  function removeFile (index) {
    return function (e) {
      e.preventDefault()
      attachments.splice(index, 1)
      renderAttachments()
    }
  }

  function filesAdded (e) {
    var rejections = []
    for (var i=0; i < filesInput.files.length; i++) {
      var f = filesInput.files[i]
      if (f.size > 5 * (1024*1024)) {
        var inmb = Math.round(f.size / (1024*1024) * 1e2) / 100
        rejections.push(f.name + ' is larger than the 5 megabyte limit (' + inmb + ' MB)')
      } else
        attachments.push(f)
    }
    if (rejections.length)
      swal('Error Attaching File', rejections.join(', '), 'error')
    renderAttachments()
  }

  function uploadFiles (cb) {
    var links = []
    if (attachments.length === 0)
      return cb(null, links)

    app.ui.setStatus('info', 'Uploading ('+attachments.length+' files left)...')
    attachments.forEach(function (file) {
      var link = { ext: null, name: null, size: null }
      links.push(link)

      // read file
      var ps = pushable()
      var reader = new FileReader()
      reader.onload = function () {
        ps.push(new Buffer(new Uint8Array(reader.result)))
        ps.end()
      }
      reader.onerror = function (e) {
        console.error(e)
        ps.end(new Error('Failed to upload '+file.name))
      }
      reader.readAsArrayBuffer(file)

      // hash and store
      var hasher = createHash()
      pull(
        ps,
        hasher,
        pull.map(function (buf) { return new Buffer(new Uint8Array(buf)).toString('base64') }),
        app.ssb.blobs.add(function (err) {
          if(err) return next(err)
          link.ext  = hasher.digest
          link.name = file.name
          link.size = file.size || hasher.size
          next()
        })
      )
    })

    var n = 0
    function next (err) {
      if (n < 0) return
      if (err) {
        n = -1
        app.ui.setStatus(null)
        return cb (err)
      }
      n++
      if (n === attachments.length) {
        app.ui.setStatus(null)
        cb(null, links)
      } else
        app.ui.setStatus('info', 'Uploading ('+(attachments.length-n)+' files left)...')
    }
  }

  function renderAttachments () {
    filesListEl.innerHTML = ''
    attachments.forEach(function (file, i) {
      filesListEl.appendChild(h('li', file.name, ' ', h('a', { href: '#', onclick: removeFile(i) }, 'remove')))
    })
  }

  return form
}
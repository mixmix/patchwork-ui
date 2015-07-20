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

  var attachments = (opts && opts.attachments) || []
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
  suggestBox(textarea, app.suggestOptions)

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
    renderAttachments()
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
    ui.pleaseWait(true)
    uploadFiles(function (err, extLinks) {
      if (err)
        return ui.pleaseWait(false), enable(), swal('Error Uploading Attachments', err.message, 'error')
      ui.setStatus('info', 'Publishing...')

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
    var n = 0
    var links = []
    if (attachments.length === 0)
      return cb(null, links)

    ui.setStatus('info', 'Uploading ('+attachments.length+' files left)...')
    attachments.forEach(function (file) {
      if (file.ext) {
        // pre-existing link
        links.push(file)
        next()
      } else {
        var link = { ext: null, name: file.name, size: file.size }
        links.push(link)
        app.ssb.phoenix.addFileToBlobs(file.path, function (err, hash) {
          if (err) console.error(err)
          else     link.ext = hash
          next(err)
        })
      }      
    })

    function next (err) {
      if (n < 0) return
      if (err) {
        n = -1
        ui.setStatus(null)
        return cb (err)
      }
      n++
      if (n === attachments.length) {
        ui.setStatus(null)
        cb(null, links)
      } else
        ui.setStatus('info', 'Uploading ('+(attachments.length-n)+' files left)...')
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
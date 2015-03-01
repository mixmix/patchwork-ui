'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var suggestBox = require('suggest-box')
var schemas = require('ssb-msg-schemas')
var createHash = require('multiblob/util').createHash
var pull = require('pull-stream')
var pushable = require('pull-pushable')
var u = require('../lib/util')
var com = require('./index')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

var mentionRegex = /(\s|>|^)@([^\s^<]+)/g

module.exports = function (app, parent) {

  var namesList = {} // a name->name map for the previews
  for (var id in app.names)
    namesList[app.names[id]] = app.names[id]

  var mode = 'text'
  var postMsg = { type: 'post', text: '' } // msg in construction
  if (parent)
    postMsg.repliesTo = { msg: parent }

  // markup

  var preview = h('.post-form-preview')
  var filesInput = h('input.hidden', { type: 'file', multiple: true, onchange: filesAdded })  
  var filesList = h('ul')
  var postBtn = h('button.postbtn.btn.btn-primary.btn-strong', { disabled: true }, 'Post')
  
  var textarea = h('textarea', { name: 'text', placeholder: 'Compose your message', rows: 6, onkeyup: onPostTextChange })
  suggestBox(textarea, app.suggestOptions) // decorate with suggestbox
  var textareaContainer = h('.post-form-textarea', textarea)

  var kvarea = com.kvarea(app, postMsg)
  var kvareaContainer = h('.post-form-kvarea', { style: 'display: none' }, kvarea)

  var form = h('form.post-form' + ((!!parent) ? '.reply-form' : ''), { onsubmit: post },
    h('p',
      h('small.text-muted', 
        'All posts are public. Markdown, @-mentions, and emojis are supported. ',
        h('a', { href: '#', onclick: cancel }, 'Cancel')),
      h('small.text-muted.pull-right',
         h('a', { href: '#', onclick: textmode }, 'text'),
        ' / ',
         h('a', { href: '#', onclick: datamode }, 'data'))),
    h('div',
      textareaContainer,
      kvareaContainer,
      preview,
      h('.post-form-attachments',
        filesList,
        h('a', { href: '#', onclick: addFile }, 'Click here to add an attachment'),
        postBtn,
        filesInput)))

  // handlers

  function disable () {
    postBtn.setAttribute('disabled', true)
  }

  function enable () {
    postBtn.removeAttribute('disabled')
  }

  function onPostTextChange (e) {
    postMsg.text = textarea.value
    preview.innerHTML = (!!textarea.value) ? mentions.preview(markdown.block(textarea.value), namesList) : ''
    updateSize()
    
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
    app.setStatus('info', 'Publishing...')

    // post
    var err = schemas.validate(postMsg)
    if (err) {
      app.setStatus(null)
      console.error(err)
      swal('Error While Publishing', err.message, 'error')
      return
    }

    app.ssb.add(post, function (err, msg) {
      app.setStatus(null)
      enable()
      if (err) swal('Error While Publishing', err.message, 'error')
      else {
        // auto-subscribe
        app.ssb.phoenix.subscribe(msg.key)

        if (parent)
          app.refreshPage()
        else
          window.location.hash = '#/'
      }
    })
  }

  function cancel (e) {
    e.preventDefault()
    if (parent)
      form.parentNode.removeChild(form)
    else
      window.location.hash = '#/'
  }

  function textmode (e) {
    e.preventDefault()
    mode = 'text'
    
    kvareaContainer.style.display = 'none'
    postMsg = com.kvarea.getValue(app, kvarea)

    textareaContainer.style.display = 'block'
    textarea.value = postMsg.text
    if (textarea.value)
      preview.innerHTML = mentions.preview(markdown.block(textarea.value), namesList)
    filesList.style.display = 'block'
    renderAttachments()
  }

  function datamode (e) {
    e.preventDefault()
    mode = 'data'

    textareaContainer.style.display = 'none'
    filesList.style.display = 'none'
    preview.innerHTML = ''

    com.kvarea.setValue(app, kvarea, postMsg)
    kvareaContainer.style.display = 'block'
  }

  function addFile (e) {
    e.preventDefault()
    filesInput.click() // trigger file-selector
  }

  function removeFile (index) {
    return function (e) {
      e.preventDefault()
      postMsg.attachments.splice(index, 1)
      renderAttachments()
    }
  }

  function filesAdded (e) {
    app.setStatus('info', 'Reading files...')
    disable()

    var done = multicb({ pluck: 1 })
    for (var i=0; i < filesInput.files.length; i++) {
      uploadFile(filesInput.files[i], done())
    }

    done(function (err, links) {
      app.setStatus(null)
      enable()

      if (!links)
        return

      if (mode == 'data')
        postMsg = com.kvarea.getValue(app, kvarea)
      postMsg.attachments = (postMsg.attachments || []).concat(links)
      if (mode == 'data')
        com.kvarea.setValue(app, kvarea, postMsg)
      renderAttachments()
    })
  }

  function uploadFile (file, cb) {
    var link = { rel: 'attachment', ext: null, name: file.name, size: file.size }

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
        if (err) {
          console.error(err)
          cb(err)
        } else {
          link.ext = hasher.digest
          cb(null, link)
        }
      })
    )
  }

  function renderAttachments () {
    filesList.innerHTML = ''
    ;(postMsg.attachments || []).forEach(function (link, i) {
      filesList.appendChild(h('li', link.name, ' (', u.bytesHuman(link.size), ') ', h('a', { href: '#', onclick: removeFile(i) }, 'remove')))
    })
    updateSize()
  }

  function estimateSize () {
    return u.stringByteLength(JSON.stringify(postMsg))
  }

  // 700b is roughly how big we can let it be before (with the header) it hits the 1kb limit
  function updateSize () {
    var len = estimateSize()
    postBtn.dataset.label = len + ' / 700'
    if (len > 700) postBtn.classList.add('error')
    else postBtn.classList.remove('error')
  }

  return form
}
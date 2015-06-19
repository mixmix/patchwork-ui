'use strict'
var h = require('hyperscript')
var suggestBox = require('suggest-box')
var schemas = require('ssb-msg-schemas')
var mlib = require('ssb-msgs')
var createHash = require('multiblob/util').createHash
var pull = require('pull-stream')
var pushable = require('pull-pushable')
var com = require('./index')
var util = require('../lib/util')
var markdown = require('../lib/markdown')
var mentionslib = require('../lib/mentions')

module.exports = function (app, parent, opts) {

  var recipients = (opts && opts.recipients) ? opts.recipients : []
  var attachments = []
  var namesList = {} // a name->name map for the previews
  for (var id in app.users.names)
    namesList[app.users.names[id]] = app.users.names[id]
  var placeholder = (opts && opts.placeholder) ? opts.placeholder : ('Write your ' + (!parent ? 'status' : 'comment'))

  // markup

  var previewEl = h('.post-form-preview')
  var filesInput = h('input.hidden', { type: 'file', multiple: true, onchange: filesAdded })  
  var filesListEl = h('ul')
  var textarea = h('textarea', { name: 'text', placeholder: placeholder, rows: ((opts && opts.rows) ? opts.rows : 6), onkeyup: onPostTextChange })
  var recpInput = h('input', { onsuggestselect: onSelectRecipient, onkeydown: onRecpInputKeydown })
  var recipientsEl = h('.post-form-recipients', 'Recipients: ', recpInput)
  var postBtn = h('button.postbtn.btn', { disabled: true }, 'Share')
  suggestBox(textarea, app.ui.suggestOptions)
  suggestBox(recpInput, { any: app.ui.suggestOptions['@'] }, { cls: 'msg-recipients' })
  renderRecpList()

  var form = h('form.post-form' + ((!!parent) ? '.reply-form' : ''), { onsubmit: post },
    h('small.text-muted', 'Markdown, @-mentions, and emojis are supported. ', h('a', { href: '#', onclick: cancel }, 'Cancel')),
    h('.post-form-textarea', textarea),
    previewEl,
    recipientsEl,
    h('.post-form-attachments',
      filesListEl,
      h('a', { href: '#', onclick: addFile }, 'Click here to add an attachment'),
      postBtn,
      filesInput))

  function disable () {
    postBtn.setAttribute('disabled', true)
  }

  function enable () {
    postBtn.removeAttribute('disabled')
  }

  function renderRecpList () {
    // remove all .recp
    Array.prototype.forEach.call(recipientsEl.querySelectorAll('.recp'), function (el) {
      recipientsEl.removeChild(el)
    })

    // render
    if (recipients.length === 0) {
      recipientsEl.insertBefore(h('.recp', com.icon('globe'), ' Public'), recpInput)
    } else {
      recipients.forEach(function (id) {
        recipientsEl.insertBefore(h('.recp',
          com.icon('lock'),
          ' ',
          com.userName(app, id),
          ' ',
          h('a', { href: '#', onclick: onRemoveRecipient, 'data-id': id, innerHTML: '&times;' })
        ), recpInput)
      })
    }
  }

  // handlers

  function onPostTextChange (e) {
    var len = updateSize()
    previewEl.innerHTML = (!!textarea.value) ? mentionslib.preview(markdown.block(textarea.value), namesList) : ''
    if (textarea.value.trim() && len <= 7800)
      enable()
    else
      disable()
  }

  function onSelectRecipient (e) {
    // remove if already exists (we'll push to end of list so user sees its there)
    var i = recipients.indexOf(e.detail.id)
    if (i !== -1)
      recipients.splice(i, 1)

    // add, render
    recipients.push(e.detail.id)
    recpInput.value = ''
    renderRecpList()
  }

  function onRemoveRecipient (e) {
    e.preventDefault()
    var i = recipients.indexOf(e.target.dataset.id)
    if (i !== -1) {
      recipients.splice(i, 1)
      renderRecpList()
      recpInput.focus()
    }
  }

  function onRecpInputKeydown (e) {
    // backspace on an empty field?
    if (e.keyCode == 8 && recpInput.value == '' && recipients.length) {
      recipients.pop()
      renderRecpList()
    }
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

      // prep text
      app.ssb.phoenix.getIdsByName(function (err, idsByName) {

        // collect any mentions
        var match
        var mentions = [], mentionedIds = {}
        while ((match = mentionslib.regex.exec(text))) {
          var name = match[2]
          var id = idsByName[name]
          if (mlib.isHash(id)) {
            if (!mentionedIds[id]) {
              mentions.push({ feed: id, name: name })
              mentionedIds[id] = true
            }
          } else if (mlib.isHash(name)) {
            if (!mentionedIds[name]) {
              mentions.push({ feed: name })
              mentionedIds[name] = true
            }
          }
        }

        // post
        var post = schemas.schemas.post(text)
        if (parent)          post.repliesTo = { msg: parent.key }
        if (mentions.length) post.mentions = mentions
        if (extLinks.length) post.attachments = extLinks
        app.ssb.publish(post, function (err, msg) {
          app.ui.setStatus(null)
          enable()
          app.ui.pleaseWait(false)
          if (err) swal('Error While Publishing', err.message, 'error')
          else {
            app.ssb.phoenix.subscribe(msg.key)
            app.ssb.phoenix.markRead(msg.key)
            opts && opts.onpost && opts.onpost(msg)
          }
        })
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
    for (var i=0; i < filesInput.files.length; i++)
      attachments.push(filesInput.files[i])
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
    updateSize()
  }

  // :TODO: write tests for this alg
  var headerSizeEstimate = 314
  // sizeof:
  //{"previous":"vLpc/PFs4J2PV4193DfK6MPq5FB+D2X91gRiS21lvxc=.blake2s","author":"2K5koZGmdq3F7K2162zN8nGn0mwFPsR69MxYe7U2ags=.blake2s","sequence":3,"timestamp":1424580609014,"hash":"blake2s","content":,"signature":"ftMwWwA2QvfVCC2Vtaje1SYHyP4hYX0Tzt1i/J+Ato2vW28J0Gzf3kcYa/scoQP6j7MBgkCCqpBcXoXC49MhHg==.blake2s.k256"}
  var fakeFeed = 'kIetR4xx26Q2M62vG0tNrptJDFnxP0SexLHaOIkyy08=.blake2s'
  var fakeMsg  = 'u9JIdDDHXO8Tx9WuMkMBUU6kepaRwCMmnwBufWcEUp0=.blake2s'
  var fakeExt  = 'tK8HVu8+WEpRoxJWnP4Bon6V6JRg0gXGZlxxKs3KkQI=.blake2s'
  function estimateSize () {
    var text = textarea.value

    // collect files
    var extLinks = attachments.map(function (file) {
      return { ext: fakeExt, name: file.name, size: file.size }
    })

    // collect mentions
    var match
    var mentions = [], mentionedIds = {}
    while ((match = mentionslib.regex.exec(text))) {
      var name = match[2]
      
      if (mentionedIds[name])
        continue
      mentionedIds[name] = true

      if (mlib.isHash(name))
        mentions.push({ feed: fakeFeed })        
      else
        mentions.push({ feed: fakeFeed, name: name })  
    }

    // post
    var post = schemas.schemas.post(text)
    if (parent) post.repliesTo = { msg: parent.key }
    if (mentions.length) post.mentions = mentions
    if (extLinks.length) post.attachments = extLinks

    return JSON.stringify(post).length + headerSizeEstimate
  }

  // 700b is roughly how big we can let it be before the header hits the 1kb limit
  function updateSize () {
    var len = estimateSize() - headerSizeEstimate
    postBtn.dataset.label = len + ' / 7800'
    if (len > 7800) postBtn.classList.add('error')
    else postBtn.classList.remove('error')
    return len
  }

  return form
}
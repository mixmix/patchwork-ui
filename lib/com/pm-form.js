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

module.exports = function (opts) {

  var recipients = (opts && opts.recipients) ? opts.recipients : []
  var attachments = []
  var placeholder = (opts && opts.placeholder) ? opts.placeholder : ''

  // make sure there are no name conflicts first
  var conflicts = []
  for (var k in app.actionItems) {
    var item = app.actionItems[k]
    if (item.type == 'name-conflict') {
      conflicts.push(h('.note.warning', 
        h('h3', 'Heads up!'),
        h('p', 'You are following more than one user named "'+item.name+'." You need to rename one of them before you send secret messages, to avoid confusion.'),
        h('ul.list-inline', item.ids.map(function (id) { return h('li', com.userImg(id), ' ', com.user(id)) }))
      ))
    }
  }
  if (conflicts.length)
    return h('.notifications', { style: 'margin-top: 24px' }, conflicts)

  // markup

  var filesInput = h('input.hidden', { type: 'file', multiple: true, onchange: filesAdded })  
  var filesListEl = h('ul')
  var recpInput = h('input', { onsuggestselect: onSelectRecipient, onkeydown: onRecpInputKeydown })
  var recipientsEl = h('.pm-form-recipients', h('span.recp-label', 'To'), recpInput)
  var subjectInput = h('input', { placeholder: 'Subject' })
  var textarea = h('textarea', { name: 'text', placeholder: placeholder, onkeyup: onTextChange })
  var postBtn = h('button.postbtn.btn', { disabled: true }, 'Send')
  suggestBox(textarea, app.suggestOptions)
  suggestBox(recpInput, { any: app.suggestOptions['@'] }, { cls: 'msg-recipients' })
  renderRecpList()

  var form = h('form.pm-form', { onsubmit: post },
    recipientsEl,
    h('.pm-form-subject', subjectInput),
    h('.pm-form-textarea', textarea),
    h('.pm-form-attachments',
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
    recipients.forEach(function (id) {
      recipientsEl.insertBefore(h('.recp',
        com.icon('lock'),
        ' ',
        com.userName(id),
        ' ',
        h('a', { href: '#', onclick: onRemoveRecipient, 'data-id': id, innerHTML: '&times;', tabIndex: '-1' })
      ), recpInput)
    })

    resizeTextarea()
  }

  // handlers

  function onTextChange (e) {
    if (recipients.length && textarea.value.trim())
      enable()
    else
      disable()
  }

  function onSelectRecipient (e) {
    // remove if already exists (we'll push to end of list so user sees its there)
    var i = recipients.indexOf(e.detail.id)
    if (i !== -1)
      recipients.splice(i, 1)

    // enforce limit
    if (recipients.length >= 7)  {
      ui.notice('warning', 'Cannot add @'+recpInput.value+' - You have reached the limit of 7 recipients on a Secret Message.')
      recpInput.value = ''
      return
    }

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

  // dynamically sizes the textarea based on available space
  // (no css method, including flexbox, would really nail this one)
  function resizeTextarea () {
    try {
      var height = 400 - 4
      height -= recipientsEl.getClientRects()[0].height
      height -= form.querySelector('.pm-form-subject').getClientRects()[0].height
      height -= form.querySelector('.pm-form-attachments').getClientRects()[0].height
      textarea.style.height = height + 'px'
    } catch (e) {
      // ignore, probably havent rendered yet
    }
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

        // make sure the user is in the recipients
        if (recipients.indexOf(app.user.id) === -1)
          recipients.push(app.user.id)

        // list recipients with their names
        var recps = recipients.map(function (id) {
          return { feed: id, name: com.userName(id) }
        })

        // publish
        var mail = {
          type: 'mail',
          recps: recps,
          subject: subjectInput.value,
          body: text
        }
        if (mentions.length) mail.mentions = mentions
        if (extLinks.length) mail.attachments = extLinks
        app.ssb.publishBoxed(mail, recipients, function (err, msg) {
          ui.setStatus(null)
          enable()
          ui.pleaseWait(false)
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

    ui.setStatus('info', 'Uploading ('+attachments.length+' files left)...')
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
    resizeTextarea()
  }

  return form
}
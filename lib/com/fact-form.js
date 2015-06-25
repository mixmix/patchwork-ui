'use strict'
var h = require('hyperscript')
var suggestBox = require('suggest-box')
var mlib = require('ssb-msgs')
var com = require('./index')

var mentionRegex = /(\s|>|^)@([^\s^<]+)/g

module.exports = function (app, targetFeed, opts) {

  // markup

  var textarea = h('input.form-control', { name: 'text', placeholder: 'is... was... created... manages...', onkeyup: onPostTextChange })
  suggestBox(textarea, app.ui.suggestOptions) // decorate with suggestbox 
  var postBtn = h('button.postbtn.btn.btn-default', { disabled: true }, 'Add')

  var form = h('form.fact-form', { onsubmit: post },
    h('.fact-form-subject', com.icon('info-sign'), ' ', com.user(app, targetFeed)),
    h('.fact-form-textarea', textarea),
    postBtn)

  function disable () {
    postBtn.setAttribute('disabled', true)
  }

  function enable () {
    postBtn.removeAttribute('disabled')
  }

  // handlers

  function onPostTextChange (e) {
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
    app.ui.pleaseWait(true)
    app.ui.setStatus('info', 'Publishing...')

    // prep text
    app.ssb.phoenix.getIdsByName(function (err, idsByName) {

      // collect any mentions
      var match
      var mentions = [], mentionedIds = {}
      while ((match = mentionRegex.exec(text))) {
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
      var fact = {
        type: 'fact',
        factAbout: { feed: targetFeed },
        text: text
      }
      if (mentions.length) fact.mentions = mentions
      app.ssb.publish(fact, function (err, msg) {
        app.ui.setStatus(null)
        enable()
        app.ui.pleaseWait(false)
        if (err) swal('Error While Publishing', err.message, 'error')
        else {
          // auto-subscribe
          app.ssb.phoenix.subscribe(msg.key)
          opts && opts.onpost && opts.onpost()
        }
      })
    })
  }

  function cancel (e) {
    e.preventDefault()
    form.parentNode.removeChild(form)
  }

  // :TODO: write tests for this alg
  var headerSizeEstimate = 314
  // sizeof:
  //{"previous":"vLpc/PFs4J2PV4193DfK6MPq5FB+D2X91gRiS21lvxc=.blake2s","author":"2K5koZGmdq3F7K2162zN8nGn0mwFPsR69MxYe7U2ags=.blake2s","sequence":3,"timestamp":1424580609014,"hash":"blake2s","content":,"signature":"ftMwWwA2QvfVCC2Vtaje1SYHyP4hYX0Tzt1i/J+Ato2vW28J0Gzf3kcYa/scoQP6j7MBgkCCqpBcXoXC49MhHg==.blake2s.k256"}
  var fakeFeed = 'kIetR4xx26Q2M62vG0tNrptJDFnxP0SexLHaOIkyy08=.blake2s'
  function estimateSize () {
    var text = textarea.value

    // collect mentions
    var match
    var mentions = [], mentionedIds = {}
    while ((match = mentionRegex.exec(text))) {
      var name = match[2]
      
      if (mentionedIds[name])
        continue
      mentionedIds[name] = true

      if (mlib.isHash(name))
        mentions.push({ feed: fakeFeed })        
      else
        mentions.push({ feed: fakeFeed, name: name })  
    }

    // build
    var fact = {
      type: 'fact',
      factAbout: { feed: targetFeed },
      text: text
    }
    if (mentions.length) fact.mentions = mentions

    return JSON.stringify(fact).length + headerSizeEstimate
  }

  // 700b is roughly how big we can let it be before the header hits the 1kb limit
  function updateSize () {
    var len = estimateSize() - headerSizeEstimate
    postBtn.dataset.label = len + ' / 700'
    if (len > 700) postBtn.classList.add('error')
    else postBtn.classList.remove('error')
  }

  return form
}
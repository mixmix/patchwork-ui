'use strict'
var h = require('hyperscript')
var o = require('observable')
var com = require('./index')

module.exports = function (parent, opts) {

  var selection = o('post')
  function navitem (icon, value) {
    return o.transform(selection, function (s) {
      return h('a'+((s == value) ? '.selected' : ''), { onclick: onSelect(value) }, com.icon(icon))
    })
  }

  // markup

  var header = h('.composer-header',
    h('.composer-header-nav',
      navitem('comment', 'post'),
      navitem('facetime-video', 'webcam')
      // navitem('picture', 'image')
    ),
    h('.composer-header-body', o.transform(selection, function (s) {
      if (s == 'post')
        return com.postForm(parent, { onpost: opts.onpost, noheader: true })
      if (s == 'webcam')
        return com.webcamGifferForm(parent)
      if (s == 'image')
        return com.imagesForm()
    }))
  )

  // handlers

  function onSelect (value) {
    return function (e) {
      e.preventDefault()
      selection(value)
    }
  }

  return header
}

module.exports.header = function (opts) {

  var selection = o('post')
  function navitem (icon, value) {
    return o.transform(selection, function (s) {
      return h('a'+((s == value) ? '.selected' : ''), { onclick: onSelect(value) }, com.icon(icon))
    })
  }

  // markup

  var header = h('.composer-header',
    h('.composer-header-nav',
      navitem('comment', 'post'),
      navitem('facetime-video', 'webcam')
      // navitem('picture', 'image')
    ),
    h('.composer-header-body', o.transform(selection, function (s) {
      if (s == 'post')
        return com.postForm(null, { onpost: opts.onpost, noheader: true, placeholder: 'Share a message with the world...' })
      if (s == 'webcam')
        return com.webcamGifferForm()
      if (s == 'image')
        return com.imagesForm()
      return h('em', s + ': todo')
    }))
  )

  // handlers

  function onSelect (value) {
    return function (e) {
      e.preventDefault()
      selection(value)
    }
  }

  return header
}
'use strict'
var h = require('hyperscript')
var o = require('observable')
var AnimatedGif = require('animated_gif/src/Animated_GIF.js')
var com = require('./index')

var videoOpts = {
  optional: [
    { minHeight: 150 },
    { maxHeight: 150 },
    { minWidth: 300 },
    { maxWidth: 300 }
  ]
}

module.exports = function () {

  var recordInterval
  var encoder = new Whammy.Video(10)
  var countdown = o(0)

  // markup

  var canvas = h('canvas')
  var context = canvas.getContext('2d')
  var invideo = h('video')
  var outvideo = h('video.hide', { autoplay: true, loop: true })
  var form = h('.webcam-giffer-form',
    h('.webcam-giffer-form-videos', { onmousedown: onmousedown },
      o.transform(countdown, function (c) {
        if (!c)
          return ''
        return h('.countdown', c)
      }),
      invideo,
      outvideo,
      h('br'),
      h('a.btn.btn-3d', { onclick: onrecord(1) }, com.icon('record'), ' Record 1s'), ' ',
      h('a.btn.btn-3d', { onclick: onrecord(2) }, '2s'), ' ',
      h('a.btn.btn-3d', { onclick: onrecord(3), style: 'margin-right: 10px' }, '3s'),
      h('a.text-muted', { href: '#', onclick: onreset }, com.icon('repeat'), ' Reset')
    ),
    h('.webcam-giffer-form-ctrls',
      h('textarea.form-control', { rows: 6, placeholder: 'Add a message (optional)' }),
      h('a.btn.btn-primary.pull-right.disabled', 'Publish')
    )
  )

  // handlers

  function onmousedown (e) {
    if (e.target.tagName == 'VIDEO') {
      e.preventDefault()
      startRecording()
      document.addEventListener('mouseup', onmouseup)
    }
  }
  function onmouseup (e) {
    e.preventDefault()
    stopRecording()
    document.removeEventListener('mouseup', onmouseup)
  }
  function onrecord (seconds) {
    return function (e) {
      e.preventDefault()
      startRecordingAfter(2, seconds)
    }
  }
  function onreset (e) {
    e.preventDefault()
    encoder.frames = []
    invideo.classList.remove('hide')
    outvideo.classList.add('hide')
  }


  // init webcam
  navigator.webkitGetUserMedia({ video: videoOpts, audio: false }, function (stream) {
    invideo.src = window.URL.createObjectURL(stream)
    invideo.onloadedmetadata = function () { invideo.play() }
  }, function (err) {
    swal('Failed to Access Webcam', err.toString(), 'error')
    console.error(fail)
  })

  // recording functions
  function startRecordingAfter(c, seconds) {
    // show input stream
    invideo.classList.remove('hide')
    outvideo.classList.add('hide')

    // run countdown
    countdown(c)
    var i = setInterval(function () {
      countdown(countdown() - 1)
      if (countdown() === 0) {
        clearInterval(i)
        startRecording(seconds)
      }
    }, 1000)
  }
  function startRecording (seconds) {
    // show input stream
    invideo.classList.remove('hide')
    outvideo.classList.add('hide')

    // add 'recording' border
    invideo.classList.add('recording')

    // start capture
    recordInterval = setInterval(captureFrame, 1000/10)
    // captureFrame()
    if (seconds)
      setTimeout(stopRecording, seconds*1000)
  }
  function captureFrame () {
    context.drawImage(invideo, 0, 0, 300, 150)
    encoder.add(canvas)
  }
  function stopRecording () {
    // stop capture
    clearInterval(recordInterval)

    // show output stream
    invideo.classList.add('hide')
    outvideo.classList.remove('hide')

    // remove 'recording' border
    invideo.classList.remove('recording')

    // produce output
    var blob = encoder.compile()
    console.log('Webm video encoded:', blob.size, 'bytes')
    outvideo.src = URL.createObjectURL(blob, 'video/webm')
  }

  return form
}
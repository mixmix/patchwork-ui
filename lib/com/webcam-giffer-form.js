'use strict'
var h = require('hyperscript')
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

  // markup

  var canvas = h('canvas')
  var invideo = h('video')
  var outvideo = h('video.hide', { autoplay: true, loop: true })
  var form = h('.webcam-giffer-form',
    h('.webcam-giffer-form-videos', { onmousedown: onmousedown },
      invideo,
      outvideo,
      h('br'),
      h('a.btn.btn-3d', com.icon('record'), ' Record 1s'), ' ',
      h('a.btn.btn-3d', '2s'), ' ',
      h('a.btn.btn-3d', { style: 'margin-right: 10px' }, '3s'),
      h('a.text-muted', com.icon('repeat'), ' Reset')
    ),
    h('.webcam-giffer-form-ctrls',
      h('textarea.form-control', { rows: 6, placeholder: 'Add a message (optional)' }),
      h('a.btn.btn-primary.pull-right.disabled', 'Publish')
    )
  )

  // handlers

  function onmousedown (e) {
    e.preventDefault()
    startRecording()
    document.addEventListener('mouseup', onmouseup)
  }
  function onmouseup (e) {
    e.preventDefault()
    stopRecording()
    document.removeEventListener('mouseup', onmouseup)
  }

  // video behaviors

  var recordInterval
  var context = canvas.getContext('2d')
  var encoder = new Whammy.Video(10)

  // init webcam
  navigator.webkitGetUserMedia({ video: videoOpts, audio: false }, function (stream) {
    invideo.src = window.URL.createObjectURL(stream)
    invideo.onloadedmetadata = function () { invideo.play() }
  }, function (err) {
    swal('Failed to Access Webcam', err.toString(), 'error')
    console.error(fail)
  })

  // recording functions
  function startRecording () {
    invideo.classList.add('recording')
    invideo.classList.remove('hide')
    outvideo.classList.add('hide')
    recordInterval = setInterval(captureFrame, 1000/10)
    captureFrame()
  }
  function captureFrame () {
    console.log('cap')
    context.drawImage(invideo, 0, 0, 300, 150)
    encoder.add(canvas)
  }
  function stopRecording () {
    invideo.classList.remove('recording')
    invideo.classList.add('hide')
    outvideo.classList.remove('hide')
    clearInterval(recordInterval)

    console.log('processing...')
    var blob = encoder.compile()
    console.log(blob.size)
    outvideo.src = URL.createObjectURL(blob, 'video/webm')
  }

  return form
}
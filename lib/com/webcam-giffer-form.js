'use strict'
var h = require('hyperscript')
var AnimatedGif = require('animated_gif/src/Animated_GIF.js')
var toBlob = require('data-uri-to-blob')

var videoOpts = {
  optional: [
    { minHeight: 210 },
    { maxHeight: 210 },
    { minWidth: 280 },
    { maxWidth: 280 }
  ]
}

module.exports = function () {

  // markup

  var invideo = h('video', { onmousedown: onmousedown })
  var outimg = h('img')
  var form = h('.webcam-giffer-form',
    h('.webcam-giffer-form-videos', invideo, outimg),
    h('.webcam-giffer-form-ctrls')
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
  var gif = new AnimatedGif({ width: 280, height: 210, useQuantizer: true,/* dithering: 'floyd',*/ workerPath: './Animated_GIF.worker.min.js' })
  gif.setRepeat(0)
  gif.setDelay(0.05)

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
    recordInterval = setInterval(captureFrame, 1000/10)
    captureFrame()
  }
  function captureFrame () {
    console.log('cap')
    gif.addFrame(invideo)
  }
  function stopRecording () {
    invideo.classList.remove('recording')
    clearInterval(recordInterval)

    console.log('processing...')
    gif.getBlobGIF(function (blob) {
      console.log(blob.size)
      outimg.src = URL.createObjectURL(blob, {type:'image/gif'})
    })
  }

  return form
}
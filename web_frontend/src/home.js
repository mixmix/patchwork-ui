var document = require('global/document')
var window = require('global/window')
var mercury = require('mercury')

var models = require('./lib/models.js')
var bus = require('./lib/business.js')
var createEvents = require('./home/events.js')
var render = require('./home/render.js')
var handlers = require('./home/handlers.js')

// init app
var state = createApp()
mercury.app(document.body, state, render)
handlers.setRoute(state, window.location.hash)

module.exports = createApp
function createApp() {
  var events = createEvents()
  var state = window.state = models.homeApp(events)
  bus.setupHomeApp(state)
  wireUpEvents(state, events)
  return state
}

function wireUpEvents(state, events) {
  for (var k in handlers) {
    events[k](handlers[k].bind(null, state))
  }
}
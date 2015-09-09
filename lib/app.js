'use strict'

/*
Application Master State
========================
Common state which either exists as part of the session,
or which has  been  loaded  from  scuttlebot during page
refresh because  its  commonly  needed during rendering.
*/

// master state object
module.exports = { mixin: mixin }

function mixin (obj) {
  for (var k in obj)
    module.exports[k] = obj[k]
}

var follows =
exports.follows = function (app, a, b) {
  var ap = app.users.profiles[a]
  if (!ap) return false
  return ap.assignedTo[b] && ap.assignedTo[b].following
}

var flags =
exports.flags = function (app, a, b) {
  var ap = app.users.profiles[a]
  if (!ap) return false
  return ap.assignedTo[b] && ap.assignedTo[b].flagged
}

var followeds =
exports.followeds = function (app, a) {
  var ids = []
  for (var b in app.users.profiles) {
    if (follows(app, a, b))
      ids.push(a)
  }
  return ids
}

var followers =
exports.followers = function (app, b) {
  var ids = []
  for (var a in app.users.profiles) {
    if (follows(app, a, b))
      ids.push(a)
  }
  return ids
}

var followedFollowers =
exports.followedFollowers = function (app, a, c, includeA) {
  var ids = []
  for (var b in app.users.profiles) {
    if (follows(app, a, b) && follows(app, b, c))
      ids.push(b)
  }
  if (includeA && follows(app, a, c))
    ids.push(a)
  return ids
}

var unfollowedFollowers =
exports.unfollowedFollowers = function (app, a, c) {
  var ids = []
  for (var b in app.users.profiles) {
    if (a != b && !follows(app, a, b) && follows(app, b, c))
      ids.push(b)
  }
  return ids
}

var followedFlaggers =
exports.followedFlaggers = function (app, a, c, includeA) {
  var ids = []
  for (var b in app.users.profiles) {
    if (follows(app, a, b) && flags(app, b, c))
      ids.push(b)
  }
  if (includeA && flags(app, a, c))
    ids.push(a)
  return ids
}
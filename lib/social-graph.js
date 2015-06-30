
exports.getFollowsByFolloweds = function(myid, targetid, follows) {
  var ids = []
  for (var id in follows) {
    // a friend? and have they followed ?
    if (follows[myid][id] && (follows[id] && follows[id][targetid]))
      ids.push(id)
  }
  return ids
}
exports.getFollowsByFollowedsAndMe = function(myid, targetid, follows) {
  var ids = []
  for (var id in follows) {
    // me or a friend? and have they followed ?
    if ((id == myid || follows[myid][id]) && (follows[id] && follows[id][targetid]))
      ids.push(id)
  }
  return ids
}

exports.getFlagsByFolloweds = function(myid, targetid, follows, trusts) {
  var ids = []
  for (var id in trusts) {
    // a friend? and have they flagged?
    if (follows[myid][id] && (trusts[id] && trusts[id][targetid] == -1))
      ids.push(id)
  }
  return ids
}

exports.getFlagsByFollowedsAndMe = function(myid, targetid, follows, trusts) {
  var ids = []
  for (var id in trusts) {
    // me or a friend? and have they flagged?
    if ((id == myid || follows[myid][id]) && (trusts[id] && trusts[id][targetid] == -1))
      ids.push(id)
  }
  return ids
}
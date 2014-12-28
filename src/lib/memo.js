var cache = {}
var slice = Array.prototype.slice
module.exports = function(id, fn) {
  if (!cache[id]) {
    var args = slice.call(arguments, 2)
    cache[id] = fn.apply(null, args)
  }
  return cache[id]
}
module.exports.clear = function(prefix) {
  if (!prefix)
    cache = {}
  else {
    Object.keys(cache).forEach(function(key) {
      if (key.indexOf(prefix) === 0)
        delete cache[key]
    })
  }
}
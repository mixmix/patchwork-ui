var api   = require('phoenix-api')

exports.name        = 'phoenix'
exports.version     = '1.0.0'
exports.manifest    = api.manifest
exports.permissions = api.permissions

exports.init = function (server) {
  return api.init(server)
}

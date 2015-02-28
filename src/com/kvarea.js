var h = require('hyperscript')

module.exports = function (app, value) {
  var kvarea = h('table.kvarea')
  setValue(app, kvarea, value)
  return kvarea
}

var setValue =
module.exports.setValue = function (app, table, value) {
  table.innerHTML = ''
  table.appendChild(h('tbody', rows(value)))
}

function rows (obj, path) {
  function row (k, v) {
    return h('tr', h('td', {contentEditable: true}, path+k), h('td', {contentEditable: true}, v))
  }

  var els = []
  path = (path) ? path + '.' : ''
  for (var k in obj) {
    if (obj[k] && typeof obj[k] == 'object')
      els = els.concat(rows(obj[k], path+k))
    else
      els.push(row(k, ''+obj[k]))

  }

  return els 
}



var TAB = 9
function onkeydown (e) {
  if (e.keyCode == TAB) {
    console.log(e.target)
    // e.preventDefault()
  }
}

function onaddrow (e) {
  e.preventDefault()
  testTable.appendChild(h('tr', h('td', { contentEditable: true, onkeydown: onkeydown }), h('td', { contentEditable: true, onkeydown: onkeydown })))
}
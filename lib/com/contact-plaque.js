var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var com = require('./index')
var u = require('../util')

module.exports = function (app, profile, followers, flaggers) {

  // markup 

  var contactId   = profile.id
  var name        = com.userName(app, contactId)
  var isSelf      = (contactId == app.user.id)

  var profileImg = com.profilePicUrl(app, contactId)
  var totem = h('.totem',
    h('span.corner.topleft'),    
    h('span.corner.topright'),
    h('span.corner.botleft', { 'data-overlay': 'Followers' }, h('.corner-inner', followers.length, com.icon('user'))),
    h('span.corner.botright', { 'data-overlay': 'Flags' }, h('.corner-inner', flaggers.length, com.icon('flag'))),
    h('a.profpic', { href: '#/profile/'+contactId }, com.hexagon(profileImg, 275)))

  // profile title
  var joinDate = (profile && profile.createdAt) &&
    u.prettydate(new Date(profile.createdAt), true)
  var title = h('.title',
    h('h2', name),
    (joinDate) ?
      h('p.text-muted', 'joined '+joinDate) :
      '')

  // totem colors derived from the image
  var tmpImg = document.createElement('img')
  tmpImg.src = profileImg
  tmpImg.onload = function () {
    var rgb = u.getAverageRGB(tmpImg)
    if (rgb) {
      // color-correct to try to go within 96-128 of average
      var avg = (rgb.r + rgb.g + rgb.b) / 3
      if (avg > 128) {
        rgb.r = (rgb.r/2)|0
        rgb.g = (rgb.g/2)|0
        rgb.b = (rgb.b/2)|0
        avg = (rgb.r + rgb.g + rgb.b) / 3
      }
      while (avg < 96) {
        var ratio = (96 - avg)/96 + 1
        if (ratio < 1.2)
          ratio = 1.2
        rgb.r = (rgb.r*ratio)|0
        rgb.g = (rgb.g*ratio)|0
        rgb.b = (rgb.b*ratio)|0
        avg = (rgb.r + rgb.g + rgb.b) / 3
      }
      var rgb2 = { r: ((rgb.r/2)|0), g: ((rgb.g/2)|0), b: ((rgb.b/2)|0) }

      try { title.querySelector('h2').style.color = 'rgb('+rgb2.r+','+rgb2.g+','+rgb2.b+')' } catch (e) {}
      try { title.querySelector('h3').style.color = 'rgba('+rgb2.r+','+rgb2.g+','+rgb2.b+', 0.75)' } catch (e) {}
      try { title.querySelector('p').style.color  = 'rgba('+rgb2.r+','+rgb2.g+','+rgb2.b+', 0.75)' } catch (e) {}
      function setColors (el) {
        if (!el.classList.contains('selected')) {
          el.style.color = 'rgba(255,255,255,0.35)'//'rgb('+rgb.r+','+rgb.g+','+rgb.b+')'
          el.style.background = 'rgb('+rgb2.r+','+rgb2.g+','+rgb2.b+')'
        } else {
          el.style.color = 'rgba(255,255,255,0.5)'
          el.style.background = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')'
        }
      }
      Array.prototype.forEach.call(totem.querySelectorAll('.corner'), setColors)
    }
  }

  return h('.contact-summary', totem, title)
}
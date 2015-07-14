# On Using Hyperscript Instead of React

Look, let's just get this out of the way.
You were going to tell me, it's too bad I didn't use React to write Patchwork's UI.
You were, weren't you?
It's alright, I don't mind.
Go ahead and say it!
"You should've used React!"
Let it out!

There, don't you feel better?


This decision was purely personal preference.
I don't think React is bad.
I looked at it, appreciated it, and then chose something else.

[You know those toys with the different holes, and the matching shapes to fill the holes?](https://www.google.com/search?tbm=isch&q=hole+shapes+toy)
Suppose you're playing with that, and you only like the cylinders.
Squares, stars, and pentagons are not for you - the edges hurt your fingers, and, besides that, they're inconsistent and inelegant shapes.
You have to spend time lining them up correctly.
Sometimes you pick the wrong shape, and have to get another one.
Obviously, the toy would be more efficient if it only used cylinders!
So, what do you do?
You buy some plywood, cut circular holes in it, and lay that over the toy.
Now every hole is for a cylinder.

This is what frameworks feel like, to me.
They're a heavy sheet of plywood that forces my code into a single shape.
It doesn't work for me.
I inevitably cut squares back into the plywood, either because I have an edge-case the framework didn't include, or because I want to hack an idea into the prototype, and the framework demands thirteen different file-changes to do it.
No thanks, framework!
You're really not solving things for me.
The only problem I have with browsers is the lack of templating APIs.
The rest comes down to code organization, which I can handle better on my own.

So, this is why I chose [Hyperscript](http://npmjs.com/package/hyperscript).
I'm fluent with the brower's squares, and stars, and pentagons.
And I've found they render just as quickly as I need them to.


About Hyperscript: it's like [Jade](http://jade-lang.com/) as a Javascript function.
It's very, very simple!
Which is what I like about it -- no frills at all.

 - You write `h()` and inside you put a selector to define the tag, id, and classes.
 - Then, optionally, an object of attributes, including event-handlers.
 - Then, optionally, any number of sub-elements.

It looks like this:

```js
var el = h('#page-nav',
  h('a.button.home', { href: '#/' }, icon('home')),
  h('a.button', { onclick: ui.navBack }, icon('arrow-left')),
  h('a.button', { onclick: ui.navForward }, icon('arrow-right')),
  h('a.button', { onclick: ui.navRefresh }, icon('refresh'))
)

function icon(i) {
  return h('span.glyphicon.glyphicon-'+i)
}
```

And here's the skinny on using it:

 1. `h()` returns an `Element`.
 2. You can put an arrays, strings, and falsey values among the elements. All of them do what you'd expect: expand in-place, render as text nodes, and get ignored, respectively.
 3. Any event handler you register using `on*` can be unregistered, all at once, with `h.cleanup()`. You should do this when you render a new page, to avoid memory leaks - which you will certainly have from circular references if you don't call `h.cleanup()`.
 4. Look into `h.context()` if you have a small region of elements which will need event unregistration, independent of the rest of the page.

Now, if react devs and I agree on anything, it's that writing components inside JS is *wonderful*.
Templating languages have a habit of becoming Turing-complete because, frankly, they should be.
You need logic, reusable code blocks, iteration, recursion, data-manipulation...
Why fight that?

```js
function renderEntry (entry) {
  if (entry.isDirectory)
    return h('.directory', entry.files.map(renderEntry))
  return h('.file', entry.name)
}
```

```js
var btn = h('a.btn', { onclick: togglePressed }, h('span.glyphicon.glyphicon-ok'))
function togglePressed (e) {
  // Minor convenience: e.target could either be 'a.btn' or 'span.glyphicon'
  // Good thing we already captured 'btn'
  btn.classList.toggle('pressed')
}
```

```js
var com = require('./lib/com')
function profilePage (userId) {
  return com.layout.twocol(
    com.layout.main(com.messageFeed({ author: userId })),
    com.layout.side(
      com.profilePic(userId),
      com.userName(userId),
      com.followControls(userId)
    )
  )
)
// Is this semantic enough for you hippies?
```

And that's all there is to it.
It's really not that far off from JSX.
Not at all!
You may not like the look of Hyperscript (I hated it when I first saw it) but, functionally, it's undeniably similar.
And! it doesn't involve a compile step, or a new syntax, or the many other decisions that React has made for you.
All the other bells and whistles I'm missing?
[Well, I wouldn't exactly say I'm missing them, Bob.](https://i.ytimg.com/vi/kXsIfpnThFA/maxresdefault.jpg)

I may pull in a virtual DOM module later -- in fact, Dominic was good enough to write [virtual-hyperscript](https://www.npmjs.com/package/virtual-hyperscript) for just such an occasion.
I probably won't, though.
I may pull in observables later -- in fact, Dominic was good enough to write [observable](https://www.npmjs.com/package/observable) too.
And I probably... 
Most likely...
Well, hmm.

Actually, I may do that.

I happen to have a hole that fits that shape.
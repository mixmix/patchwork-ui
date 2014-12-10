IGNORES = -i fs -i "proquint-" -i http -i level -i level/sublevel -i level-sublevel/bytewise -i pull-level
all: js css
js: js_home
css: css_home 
js_home: src/*
	mkdir -p js
	browserify -o js/home.js src/home.js $(IGNORES)
css_home: less/*
	mkdir -p css
	lessc less/home.less css/home.css
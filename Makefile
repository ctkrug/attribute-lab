.PHONY: build run test test-go test-js vet fmt site

build:
	go build -o bin/attribute-lab .

# Assemble the static deploy output in site/ from the app's runtime assets in
# static/ — the page, styles, service worker, and the runtime JS modules only
# (the *.test.mjs files stay out of the published bundle). This is what the
# host publishes to apps.charliekrug.com/attribute-lab/.
site:
	rm -rf site
	mkdir -p site/css site/js
	cp static/index.html site/index.html
	cp static/sw.js site/sw.js
	cp static/css/style.css site/css/style.css
	cp static/js/app.js static/js/compare.mjs static/js/lab-core.mjs static/js/demo-fragment.mjs site/js/

run: build
	./bin/attribute-lab

test: test-go test-js

test-go:
	go test -race ./...

test-js: node_modules
	node --test static/js/*.test.mjs

node_modules: package.json
	npm install --no-audit --no-fund

vet:
	go vet ./...

fmt:
	gofmt -l .

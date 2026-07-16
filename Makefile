.PHONY: build run test test-go test-js vet fmt

build:
	go build -o bin/attribute-lab .

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

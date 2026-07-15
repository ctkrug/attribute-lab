.PHONY: build run test vet fmt

build:
	go build -o bin/attribute-lab .

run: build
	./bin/attribute-lab

test:
	go test ./...

vet:
	go vet ./...

fmt:
	gofmt -l .

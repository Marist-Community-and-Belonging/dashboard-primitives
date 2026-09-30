.PHONY: test test-go check-go

test: test-go

test-go:
	cd dashboard && go test -race -cover ./...

check-go:
	cd dashboard && go vet ./...
	cd dashboard && go build -o /tmp/marist-ipeds-dashboard .

.PHONY: test test-go test-js check-go

test: test-go test-js

test-go:
	cd dashboard && go test -race -cover ./...

test-js:
	node dashboard/dashboard_test.cjs

check-go:
	cd dashboard && go vet ./...
	cd dashboard && go build -o /tmp/marist-ipeds-dashboard .

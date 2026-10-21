package main

import (
	"bufio"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"testing"
	"time"
)

func TestGracefulShutdown(t *testing.T) {
	if os.Getenv("DASHBOARD_SHUTDOWN_TEST") == "1" {
		main()
		return
	}

	command := exec.Command(os.Args[0], "-test.run=^TestGracefulShutdown$")
	command.Env = append(os.Environ(), "DASHBOARD_SHUTDOWN_TEST=1", "DASHBOARD_ADDR=127.0.0.1:0", "DASHBOARD_LOG_LEVEL=info")
	stderr, err := command.StderrPipe()
	if err != nil {
		t.Fatal(err)
	}
	if err := command.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = command.Process.Kill() })
	done := make(chan error, 1)
	go func() { done <- command.Wait() }()
	ready := make(chan string, 1)
	go func() {
		scanner := bufio.NewScanner(stderr)
		scanner.Scan()
		ready <- scanner.Text()
		_, _ = io.Copy(io.Discard, stderr)
	}()

	var address string
	select {
	case line := <-ready:
		var ok bool
		_, address, ok = strings.Cut(line, "address=")
		if !ok {
			t.Fatalf("server did not report its address: %s", line)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("server did not start")
	}

	client := &http.Client{Timeout: 2 * time.Second}
	for _, method := range []string{http.MethodGet, http.MethodHead} {
		request, err := http.NewRequest(method, "http://"+address+"/", nil)
		if err != nil {
			t.Fatal(err)
		}
		response, err := client.Do(request)
		if err != nil {
			t.Fatal(err)
		}
		body, err := io.ReadAll(response.Body)
		response.Body.Close()
		if err != nil || response.StatusCode != http.StatusOK || (method == http.MethodHead && len(body) != 0) {
			t.Fatalf("%s response: status=%d, bytes=%d, error=%v", method, response.StatusCode, len(body), err)
		}
	}
	client.CloseIdleConnections()
	if err := command.Process.Signal(syscall.SIGTERM); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("server did not shut down cleanly: %v", err)
		}
	case <-time.After(defaultShutdownTimeout + 5*time.Second):
		t.Fatal("server did not stop after SIGTERM")
	}
}

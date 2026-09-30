package main

import (
	"embed"
	"log"
	"net/http"
	"os"
)

//go:embed web
var webAssets embed.FS

func main() {
	address := os.Getenv("DASHBOARD_ADDR")
	if address == "" {
		address = ":8080"
	}

	router, err := newRouter(webAssets)
	if err != nil {
		log.Fatal(err)
	}

	server := &http.Server{
		Addr:              address,
		Handler:           router,
		ReadHeaderTimeout: defaultReadHeaderTimeout,
		ReadTimeout:       defaultReadTimeout,
		WriteTimeout:      defaultWriteTimeout,
		IdleTimeout:       defaultIdleTimeout,
	}

	log.Printf("Marist IPEDS dashboard listening on http://localhost%s", address)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

package main

import (
	"os"
	"testing"
	"time"
)

func TestParseCampusEventsRSS(t *testing.T) {
	body, err := os.ReadFile("testdata/rss_events_sample.xml")
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	payload, err := parseCampusEventsRSS(body, campusEventsFeedURL, time.Date(2026, 9, 30, 16, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("parseCampusEventsRSS: %v", err)
	}
	if payload.EventCount != 8 {
		t.Fatalf("event_count = %d, want 8", payload.EventCount)
	}
	if len(payload.Days) == 0 {
		t.Fatal("expected day counts")
	}
	foundRetreat := false
	for _, day := range payload.Days {
		if day.Date == "2026-09-28" || day.Date == "2026-09-29" || day.Date == "2026-09-30" {
			if day.Date == "2026-09-28" && day.Count < 1 {
				t.Fatalf("retreat start day count = %d", day.Count)
			}
			foundRetreat = true
		}
	}
	if !foundRetreat {
		t.Fatal("expected multi-day retreat in day counts")
	}
	if payload.Events[0].Title == "" || payload.Events[0].Start == "" {
		t.Fatalf("first event incomplete: %+v", payload.Events[0])
	}
}

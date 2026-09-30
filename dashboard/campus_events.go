package main

import (
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

const campusEventsFeedURL = "https://marist.campusgroups.com/rss_events"

var campusEventsHTTPClient = &http.Client{Timeout: 20 * time.Second}

type campusEvent struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Group        string `json:"group"`
	GroupType    string `json:"group_type"`
	EventType    string `json:"event_type"`
	Location     string `json:"location"`
	LocationType string `json:"location_type"`
	Link         string `json:"link"`
	Start        string `json:"start"`
	End          string `json:"end"`
	AllDay       bool   `json:"all_day"`
}

type campusDayCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type campusEventsPayload struct {
	Source     string           `json:"source"`
	FetchedAt  string           `json:"fetched_at"`
	EventCount int              `json:"event_count"`
	Days       []campusDayCount `json:"days"`
	Events     []campusEvent    `json:"events"`
}

type campusEventsRSS struct {
	Channel struct {
		Items []campusEventsRSSItem `xml:"item"`
	} `xml:"channel"`
}

type campusEventsRSSItem struct {
	EventID      string `xml:"eventId"`
	Title        string `xml:"title"`
	Group        string `xml:"group"`
	GroupType    string `xml:"groupType"`
	EventType    string `xml:"eventType"`
	Location     string `xml:"eventLocation"`
	LocationType string `xml:"locationType"`
	Link         string `xml:"eventLink"`
	Start        string `xml:"eventStartDateTime"`
	End          string `xml:"eventEndDateTime"`
	AllDay       string `xml:"allDayEvent"`
	EventDelete  string `xml:"eventDelete"`
}

type campusEventsCache struct {
	mu      sync.Mutex
	payload *campusEventsPayload
	expires time.Time
}

func (cache *campusEventsCache) get() (*campusEventsPayload, error) {
	cache.mu.Lock()
	defer cache.mu.Unlock()
	if cache.payload != nil && time.Now().Before(cache.expires) {
		return cache.payload, nil
	}
	payload, err := fetchCampusEvents(campusEventsFeedURL)
	if err != nil {
		return nil, err
	}
	cache.payload = payload
	cache.expires = time.Now().Add(5 * time.Minute)
	return payload, nil
}

func fetchCampusEvents(feedURL string) (*campusEventsPayload, error) {
	response, err := campusEventsHTTPClient.Get(feedURL)
	if err != nil {
		return nil, fmt.Errorf("fetch campus events feed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("campus events feed status %d", response.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, 8<<20))
	if err != nil {
		return nil, fmt.Errorf("read campus events feed: %w", err)
	}
	payload, err := parseCampusEventsRSS(body, feedURL, time.Now().UTC())
	if err != nil {
		return nil, err
	}
	return payload, nil
}

func parseCampusEventsRSS(body []byte, source string, fetchedAt time.Time) (*campusEventsPayload, error) {
	var doc campusEventsRSS
	if err := xml.Unmarshal(body, &doc); err != nil {
		return nil, fmt.Errorf("parse campus events feed: %w", err)
	}

	events := make([]campusEvent, 0, len(doc.Channel.Items))
	dayCounts := map[string]int{}
	for _, item := range doc.Channel.Items {
		if strings.TrimSpace(item.EventDelete) == "1" {
			continue
		}
		start, err := parseCampusEventTime(item.Start)
		if err != nil {
			continue
		}
		end, err := parseCampusEventTime(item.End)
		if err != nil {
			end = start
		}
		if end.Before(start) {
			end = start
		}
		link := strings.TrimSpace(item.Link)
		event := campusEvent{
			ID:           strings.TrimSpace(item.EventID),
			Title:        strings.TrimSpace(item.Title),
			Group:        strings.TrimSpace(item.Group),
			GroupType:    strings.TrimSpace(item.GroupType),
			EventType:    strings.TrimSpace(item.EventType),
			Location:     strings.TrimSpace(item.Location),
			LocationType: strings.TrimSpace(item.LocationType),
			Link:         link,
			Start:        start.Format(time.RFC3339),
			End:          end.Format(time.RFC3339),
			AllDay:       strings.TrimSpace(item.AllDay) == "1",
		}
		events = append(events, event)
		for day := truncateCampusDay(start); !day.After(truncateCampusDay(end)); day = day.AddDate(0, 0, 1) {
			dayCounts[day.Format("2006-01-02")]++
		}
	}

	sort.Slice(events, func(i, j int) bool {
		if events[i].Start == events[j].Start {
			return events[i].Title < events[j].Title
		}
		return events[i].Start < events[j].Start
	})

	days := make([]campusDayCount, 0, len(dayCounts))
	for date, count := range dayCounts {
		days = append(days, campusDayCount{Date: date, Count: count})
	}
	sort.Slice(days, func(i, j int) bool { return days[i].Date < days[j].Date })

	return &campusEventsPayload{
		Source:     source,
		FetchedAt:  fetchedAt.Format(time.RFC3339),
		EventCount: len(events),
		Days:       days,
		Events:     events,
	}, nil
}

func parseCampusEventTime(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, fmt.Errorf("empty timestamp")
	}
	if parsed, err := time.Parse("2006-01-02T15:04:05.999999999-07:00", value); err == nil {
		return parsed, nil
	}
	return time.Parse(time.RFC3339, value)
}

func truncateCampusDay(value time.Time) time.Time {
	year, month, day := value.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, value.Location())
}

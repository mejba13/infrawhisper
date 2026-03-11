package stream

import (
	"math"
	"sync"

	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
)

type stats struct {
	count float64
	mean  float64
	m2    float64
}

type AnomalyDetector struct {
	mu    sync.RWMutex
	state map[string]*stats
}

func NewAnomalyDetector() *AnomalyDetector {
	return &AnomalyDetector{state: make(map[string]*stats)}
}

func (a *AnomalyDetector) Detect(p chstore.MetricPoint) bool {
	key := p.ClusterID + ":" + p.MetricName
	a.mu.Lock()
	s, ok := a.state[key]
	if !ok {
		s = &stats{}
		a.state[key] = s
	}
	s.count++
	delta := p.MetricValue - s.mean
	s.mean += delta / s.count
	delta2 := p.MetricValue - s.mean
	s.m2 += delta * delta2
	variance := 0.0
	if s.count > 1 {
		variance = s.m2 / (s.count - 1)
	}
	stddev := math.Sqrt(variance)
	mean := s.mean
	count := s.count
	a.mu.Unlock()

	if count < 100 {
		return false
	}
	return math.Abs(p.MetricValue-mean) > 3*stddev
}

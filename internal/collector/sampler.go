package collector

import "sync"

type TailSampler struct {
	decisions sync.Map
	rate      float64
}

func NewTailSampler(rate float64) *TailSampler {
	return &TailSampler{rate: rate}
}

func (s *TailSampler) ShouldSample(traceID string, hasError bool) bool {
	if hasError {
		return true
	}
	h := fnv32(traceID)
	return float64(h%1000)/1000.0 < s.rate
}

func fnv32(str string) uint32 {
	h := uint32(2166136261)
	for i := 0; i < len(str); i++ {
		h ^= uint32(str[i])
		h *= 16777619
	}
	return h
}

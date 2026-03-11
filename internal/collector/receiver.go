package collector

import (
	"fmt"
	"net"

	"github.com/rs/zerolog"
	"google.golang.org/grpc"
)

type Receiver struct {
	grpcServer *grpc.Server
	logger     zerolog.Logger
	processor  *Processor
}

func NewReceiver(processor *Processor, logger zerolog.Logger) *Receiver {
	s := grpc.NewServer()
	r := &Receiver{grpcServer: s, logger: logger, processor: processor}
	return r
}

func (r *Receiver) Start(addr string) error {
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("collector listen: %w", err)
	}
	r.logger.Info().Str("addr", addr).Msg("OTLP gRPC receiver starting")
	return r.grpcServer.Serve(lis)
}

func (r *Receiver) Stop() {
	r.grpcServer.GracefulStop()
}

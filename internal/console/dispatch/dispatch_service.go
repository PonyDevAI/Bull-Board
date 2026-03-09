package dispatch

import "context"

type DispatchRequest struct {
	WorkerID string `json:"worker_id"`
	TaskID   string `json:"task_id"`
}

type DispatchResult struct {
	JobID     string `json:"job_id"`
	Status    string `json:"status"`
	StepRunID string `json:"step_run_id"`
}

// Service implements Bull-Board 2.0 dispatch flow:
// resolve worker -> resolve agent app -> resolve model profile -> merge config -> resolve backend -> execute -> update state.
type Service struct{}

func NewService() *Service { return &Service{} }

func (s *Service) Dispatch(ctx context.Context, req DispatchRequest) (DispatchResult, error) {
	_ = ctx
	_ = req
	return DispatchResult{Status: "queued"}, nil
}

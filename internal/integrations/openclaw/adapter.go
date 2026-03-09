package openclaw

import "context"

type TaskPayload struct {
	WorkerID string         `json:"worker_id"`
	Role     string         `json:"role"`
	AgentApp map[string]any `json:"agent_app"`
	Model    map[string]any `json:"model_profile"`
	Skills   []string       `json:"skills"`
	Plugins  []string       `json:"plugins"`
	Task     map[string]any `json:"task"`
}

type Adapter struct{}

func NewAdapter() *Adapter { return &Adapter{} }
func (a *Adapter) CreateSession(ctx context.Context, payload TaskPayload) (string, error) {
	_ = ctx
	_ = payload
	return "", nil
}
func (a *Adapter) ApplyAgentConfig(ctx context.Context, sessionID string, payload TaskPayload) error {
	_ = ctx
	_ = sessionID
	_ = payload
	return nil
}
func (a *Adapter) ExecuteTask(ctx context.Context, sessionID string, payload TaskPayload) (map[string]any, error) {
	_ = ctx
	_ = sessionID
	_ = payload
	return map[string]any{"status": "accepted"}, nil
}
func (a *Adapter) FetchArtifacts(ctx context.Context, sessionID string) ([]map[string]any, error) {
	_ = ctx
	_ = sessionID
	return nil, nil
}
func (a *Adapter) HandleExecutionResult(ctx context.Context, result map[string]any) error {
	_ = ctx
	_ = result
	return nil
}

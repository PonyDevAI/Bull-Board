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

type PreparedDispatchRequest struct {
	WorkflowRunID    string         `json:"workflow_run_id"`
	StepRunID        string         `json:"step_run_id"`
	TaskID           string         `json:"task_id"`
	Worker           map[string]any `json:"worker"`
	Role             map[string]any `json:"role"`
	AgentApp         map[string]any `json:"agent_app"`
	ExecutionBackend map[string]any `json:"execution_backend"`
	ResolvedConfig   any            `json:"resolved_config"`
	Input            any            `json:"input"`
}

type JobArtifact struct {
	Kind     string         `json:"kind"`
	URI      string         `json:"uri"`
	Metadata map[string]any `json:"metadata"`
}

type ExecutionResult struct {
	Status         string         `json:"status"`
	ExternalJobRef string         `json:"external_job_ref"`
	Output         any            `json:"output"`
	Response       map[string]any `json:"response"`
	Artifacts      []JobArtifact  `json:"artifacts"`
}

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

func (a *Adapter) ExecutePreparedDispatch(ctx context.Context, prepared PreparedDispatchRequest) (ExecutionResult, error) {
	_ = ctx
	_ = prepared
	stepID := prepared.StepRunID
	if stepID == "" {
		stepID = "step"
	}
	return ExecutionResult{
		Status:         "succeeded",
		ExternalJobRef: "openclaw-" + stepID,
		Output: map[string]any{
			"backend": "openclaw",
			"result":  "minimal execution completed",
		},
		Response: map[string]any{
			"accepted": true,
			"runtime":  "openclaw",
		},
		Artifacts: []JobArtifact{{
			Kind: "execution_log",
			URI:  "openclaw://runs/" + stepID + "/log",
			Metadata: map[string]any{
				"source": "openclaw",
			},
		}},
	}, nil
}

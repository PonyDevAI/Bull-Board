package models

import (
	"database/sql"
	"fmt"
)

type ResolvedWorkerConfig struct {
	WorkerID         string `json:"worker_id"`
	Role             any    `json:"role"`
	AgentApp         any    `json:"agent_app"`
	ExecutionBackend any    `json:"execution_backend"`
	ModelProfile     any    `json:"model_profile"`
	SystemPrompt     string `json:"system_prompt"`
	SkillPolicy      string `json:"skill_policy"`
	PluginPolicy     string `json:"plugin_policy"`
	ToolPolicy       string `json:"tool_policy"`
	ConfigOverride   string `json:"config_override"`
}

func ResolveWorkerConfig(db *sql.DB, workerID string) (*ResolvedWorkerConfig, error) {
	row := db.QueryRow(`
		SELECT w.id, w.config_override_json,
			r.id, r.name, r.code,
			a.id, a.name, a.system_prompt, a.skill_policy_json, a.plugin_policy_json, a.tool_policy_json,
			e.id, e.name, e.type, e.endpoint_url,
			m.id, m.name, m.provider, m.model_name
		FROM workers w
		JOIN roles r ON r.id = w.role_id
		JOIN agent_apps a ON a.id = w.agent_app_id
		JOIN execution_backends e ON e.id = w.execution_backend_id
		LEFT JOIN model_profiles m ON m.id = a.default_model_profile_id
		WHERE w.id = ?`, workerID)
	var cfg ResolvedWorkerConfig
	var roleID, roleName, roleCode string
	var appID, appName, backendID, backendName, backendType, endpoint string
	var modelID, modelName, provider, model string
	if err := row.Scan(&cfg.WorkerID, &cfg.ConfigOverride, &roleID, &roleName, &roleCode, &appID, &appName, &cfg.SystemPrompt, &cfg.SkillPolicy, &cfg.PluginPolicy, &cfg.ToolPolicy, &backendID, &backendName, &backendType, &endpoint, &modelID, &modelName, &provider, &model); err != nil {
		return nil, fmt.Errorf("resolve worker config: %w", err)
	}
	cfg.Role = map[string]string{"id": roleID, "name": roleName, "code": roleCode}
	cfg.AgentApp = map[string]string{"id": appID, "name": appName}
	cfg.ExecutionBackend = map[string]string{"id": backendID, "name": backendName, "type": backendType, "endpoint_url": endpoint}
	cfg.ModelProfile = map[string]string{"id": modelID, "name": modelName, "provider": provider, "model_name": model}
	return &cfg, nil
}

import { workforceApi } from "@/api";
import { WorkforceResourcePage } from "@/pages/WorkforceResourcePage";

export function AgentAppsPage() {
  return <WorkforceResourcePage title="Agent Apps" fields={["home_id", "name", "description", "default_model_profile_id", "system_prompt", "default_execution_backend_id"]} list={workforceApi.listAgentApps} create={workforceApi.createAgentApp} />;
}

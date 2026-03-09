import { workforceApi } from "@/api";
import { WorkforceResourcePage } from "@/pages/WorkforceResourcePage";

export function WorkersV2Page() {
  return <WorkforceResourcePage title="Workers" fields={["home_id", "workspace_id", "group_id", "role_id", "agent_app_id", "execution_backend_id", "name", "status", "max_concurrency"]} list={workforceApi.listWorkers} create={workforceApi.createWorker} />;
}

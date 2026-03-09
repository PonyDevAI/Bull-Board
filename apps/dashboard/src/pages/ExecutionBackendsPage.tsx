import { workforceApi } from "@/api";
import { WorkforceResourcePage } from "@/pages/WorkforceResourcePage";

export function ExecutionBackendsPage() {
  return <WorkforceResourcePage title="Execution Backends" fields={["home_id", "name", "connector_code", "integration_instance_id", "endpoint_url", "type", "status", "config_json"]} list={workforceApi.listExecutionBackends} create={workforceApi.createExecutionBackend} />;
}

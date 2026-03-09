import { workforceApi } from "@/api";
import { WorkforceResourcePage } from "@/pages/WorkforceResourcePage";

export function IntegrationsPage() {
  return <WorkforceResourcePage title="Integrations" fields={["home_id", "connector_code", "name", "endpoint", "status"]} list={workforceApi.listIntegrations} create={workforceApi.createIntegration} />;
}

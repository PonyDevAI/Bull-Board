import { workforceApi } from "@/api";
import { WorkforceResourcePage } from "@/pages/WorkforceResourcePage";

export function ModelProfilesPage() {
  return <WorkforceResourcePage title="Model Profiles" fields={["home_id", "name", "provider", "model_name", "temperature"]} list={workforceApi.listModelProfiles} create={workforceApi.createModelProfile} />;
}

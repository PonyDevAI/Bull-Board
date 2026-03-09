import { workforceApi } from "@/api";
import { WorkforceResourcePage } from "@/pages/WorkforceResourcePage";

export function RolesPage() {
  return <WorkforceResourcePage title="Roles" fields={["home_id", "name", "code", "description"]} list={workforceApi.listRoles} create={workforceApi.createRole} />;
}

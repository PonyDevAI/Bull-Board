import {
  kpis,
  disks,
  pipeline,
  runners,
  capacity,
  routing,
  quality,
  activity,
} from "@/mocks/dashboard";
import { StatCard } from "@/components/dashboard/StatCard";
import { DiskUsageRings } from "@/components/dashboard/DiskUsageRings";
import { PipelineOverview } from "@/components/dashboard/PipelineOverview";
import { RunnerHealthPanel } from "@/components/dashboard/RunnerHealthPanel";
import { CapacitySummary } from "@/components/dashboard/CapacitySummary";
import { RoleModelRouting } from "@/components/dashboard/RoleModelRouting";
import { QualityRiskPanel } from "@/components/dashboard/QualityRiskPanel";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

export function DashboardHome() {
  return (
    <div className="space-y-block">
      {/* Row1: KPI 卡 + 磁盘分区 */}
      <div className="grid gap-gap md:grid-cols-4">
        <StatCard value={kpis.load.value} label={kpis.load.label} unit={kpis.load.unit} progress={30} />
        <StatCard value={kpis.cpu.value} label={kpis.cpu.label} unit={kpis.cpu.unit} progress={kpis.cpu.value} />
        <StatCard value={kpis.mem.value} label={kpis.mem.label} unit={kpis.mem.unit} progress={kpis.mem.value} />
        <StatCard value={kpis.disk.value} label={kpis.disk.label} unit={kpis.disk.unit} progress={kpis.disk.value} />
      </div>
      <div className="grid gap-gap lg:grid-cols-3">
        <div className="lg:col-span-2" />
        <DiskUsageRings disks={disks} />
      </div>

      {/* Row2: Pipeline 概览 */}
      <PipelineOverview
        statusCounts={pipeline.statusCounts}
        avgDuration={pipeline.avgDuration}
        p95Duration={pipeline.p95Duration}
        wipThreshold={pipeline.wipThreshold}
        reviewThreshold={pipeline.reviewThreshold}
      />

      {/* Row3: Runner Health + Capacity */}
      <div className="grid gap-gap md:grid-cols-2">
        <RunnerHealthPanel runners={runners} />
        <CapacitySummary
          total={capacity.total}
          used={capacity.used}
          idle={capacity.idle}
          pending={capacity.pending}
          running={capacity.running}
        />
      </div>

      {/* Row4: Role → Model 路由 */}
      <RoleModelRouting routing={routing} />

      {/* Row5: 质量与风险 */}
      <QualityRiskPanel
        failRate24h={quality.failRate24h}
        failCount24h={quality.failCount24h}
        topReasons={quality.topReasons}
        blockedTasks={quality.blockedTasks}
      />

      {/* Row6: Activity Feed */}
      <ActivityFeed items={activity} />
    </div>
  );
}

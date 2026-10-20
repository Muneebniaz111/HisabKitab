import { getCurrentUserId } from "@/lib/session";
import { queryAuditLog, type AuditFilters } from "@/lib/audit-query";
import { AUDIT_RETENTION_DAYS } from "@/lib/audit";
import { PageHeader } from "@/components/page-header";
import { AuditLogFilters } from "@/components/audit-log/audit-log-filters";
import { AuditLogTable } from "@/components/audit-log/audit-log-table";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; status?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const userId = await getCurrentUserId();

  const filters: AuditFilters = {
    event: params.event ?? null,
    status: params.status ?? null,
    from: params.from ?? null,
    to: params.to ?? null,
  };
  const { rows, nextCursor } = await queryAuditLog(userId, filters);

  return (
    <>
      <PageHeader eyebrow={`Your activity · last ${AUDIT_RETENTION_DAYS} days`} title="Audit Log" />
      <AuditLogFilters />
      <AuditLogTable key={JSON.stringify(filters)} initialRows={rows} initialCursor={nextCursor} filters={filters} />
    </>
  );
}

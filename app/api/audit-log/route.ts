import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { queryAuditLog } from "@/lib/audit-query";

// Always scoped to the signed-in user — there's deliberately no userId param.
export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  const params = new URL(request.url).searchParams;

  const page = await queryAuditLog(
    userId,
    {
      event: params.get("event"),
      status: params.get("status"),
      from: params.get("from"),
      to: params.get("to"),
    },
    params.get("cursor")
  );

  return NextResponse.json(page);
}

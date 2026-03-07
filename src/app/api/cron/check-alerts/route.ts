// ===============================================
// GET /api/cron/check-alerts
// Cron endpoint to evaluate all enabled alerts
// Protected by CRON_SECRET bearer token
// ===============================================

import { checkAlerts } from "@/lib/services/alert-checker";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await checkAlerts();
  const triggered = results.filter((r) => r.triggered);

  return NextResponse.json({
    checked: results.length,
    triggered: triggered.length,
    results: triggered,
  });
}

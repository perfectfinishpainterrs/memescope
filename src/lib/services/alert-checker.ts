// ===============================================
// Alert Checker Service
// Evaluates enabled alerts against live data
// ===============================================

import { supabaseAdmin } from "@/lib/db/supabase";
import { getTokenData } from "@/lib/services/token-data";
import { calculateSafetyScore } from "@/lib/scoring/safety";

interface AlertResult {
  alertId: string;
  triggered: boolean;
  currentValue: number;
  message: string;
}

export async function checkAlerts(): Promise<AlertResult[]> {
  // 1. Fetch all enabled alerts
  const { data: alerts } = await supabaseAdmin
    .from("alerts")
    .select("*")
    .eq("enabled", true);

  if (!alerts?.length) return [];

  const results: AlertResult[] = [];

  for (const alert of alerts) {
    try {
      let triggered = false;
      let currentValue = 0;
      let message = "";

      switch (alert.alert_type) {
        case "price_above": {
          const tokenData = await getTokenData(
            alert.token_address,
            alert.chain
          );
          currentValue = tokenData.price || 0;
          triggered = currentValue >= alert.threshold.value;
          message = `Price reached $${currentValue} (threshold: $${alert.threshold.value})`;
          break;
        }
        case "price_below": {
          const tokenData = await getTokenData(
            alert.token_address,
            alert.chain
          );
          currentValue = tokenData.price || 0;
          triggered = currentValue <= alert.threshold.value;
          message = `Price dropped to $${currentValue} (threshold: $${alert.threshold.value})`;
          break;
        }
        case "safety_drop": {
          const safety = await calculateSafetyScore(
            alert.token_address,
            alert.chain
          );
          currentValue = safety.score;
          triggered = currentValue <= alert.threshold.value;
          message = `Safety score dropped to ${currentValue} (threshold: ${alert.threshold.value})`;
          break;
        }
        case "holder_drop": {
          // Placeholder -- needs holder snapshot tracking
          break;
        }
        case "whale_move": {
          // Placeholder -- needs whale tracking integration
          break;
        }
      }

      if (triggered) {
        // Update last_triggered timestamp
        await supabaseAdmin
          .from("alerts")
          .update({ last_triggered: new Date().toISOString() })
          .eq("id", alert.id);
      }

      results.push({ alertId: alert.id, triggered, currentValue, message });
    } catch {
      // Skip failed alerts
      results.push({
        alertId: alert.id,
        triggered: false,
        currentValue: 0,
        message: "Check failed",
      });
    }
  }

  return results;
}

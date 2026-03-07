"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Alert, Chain } from "@/types";
import { Bell, Trash2, Plus } from "lucide-react";

const ALERT_TYPES = [
  { value: "price_above", label: "Price Above", unit: "$" },
  { value: "price_below", label: "Price Below", unit: "$" },
  { value: "safety_drop", label: "Safety Score Drop", unit: "score" },
  { value: "holder_drop", label: "Holder Count Drop", unit: "%" },
  { value: "whale_move", label: "Whale Movement", unit: "SOL" },
] as const;

const CHAINS: { value: Chain; label: string }[] = [
  { value: "SOL", label: "Solana" },
  { value: "ETH", label: "Ethereum" },
  { value: "BASE", label: "Base" },
  { value: "BSC", label: "BSC" },
];

type AlertType = (typeof ALERT_TYPES)[number]["value"];

function getAlertTypeBadgeVariant(type: string) {
  switch (type) {
    case "price_above":
      return "success" as const;
    case "price_below":
      return "danger" as const;
    case "safety_drop":
      return "warning" as const;
    case "holder_drop":
      return "warning" as const;
    case "whale_move":
      return "info" as const;
    default:
      return "default" as const;
  }
}

function getAlertTypeLabel(type: string) {
  return ALERT_TYPES.find((t) => t.value === type)?.label || type;
}

function getThresholdUnit(type: AlertType) {
  return ALERT_TYPES.find((t) => t.value === type)?.unit || "";
}

function shortenAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AlertsPage() {
  // Form state
  const [tokenAddress, setTokenAddress] = useState("");
  const [chain, setChain] = useState<Chain>("SOL");
  const [alertType, setAlertType] = useState<AlertType>("price_above");
  const [threshold, setThreshold] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Alerts list state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/user/alert");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch {
      // Silently fail — user might not be authenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!tokenAddress.trim()) {
      setFormError("Token address is required");
      return;
    }
    if (!threshold || isNaN(Number(threshold)) || Number(threshold) <= 0) {
      setFormError("Enter a valid threshold value");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/user/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_address: tokenAddress.trim(),
          chain,
          alert_type: alertType,
          threshold: { value: Number(threshold) },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create alert");
      }

      const newAlert = await res.json();
      setAlerts((prev) => [newAlert, ...prev]);
      setTokenAddress("");
      setThreshold("");
      setFormSuccess("Alert created successfully");
      setTimeout(() => setFormSuccess(""), 3000);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/user/alert/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, enabled: !currentEnabled } : a
          )
        );
      }
    } catch {
      // Silently fail
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/user/alert/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1440px] mx-auto px-7 py-5">
        {/* Page title */}
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-neon-green" />
          <h1 className="font-mono font-bold text-xl text-text-primary">
            ALERTS
          </h1>
        </div>

        {/* Create Alert Form */}
        <Card className="mb-6">
          <h2 className="font-mono font-semibold text-sm text-text-primary uppercase tracking-wider mb-4">
            Create Alert
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Token address */}
              <div>
                <label className="block text-xs font-mono text-text-secondary mb-1.5">
                  Token Address
                </label>
                <Input
                  placeholder="Enter token mint address..."
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                />
              </div>

              {/* Chain selector */}
              <div>
                <label className="block text-xs font-mono text-text-secondary mb-1.5">
                  Chain
                </label>
                <select
                  value={chain}
                  onChange={(e) => setChain(e.target.value as Chain)}
                  className="w-full bg-bg-card border border-border rounded-lg px-4 py-2.5 text-text-primary font-mono text-sm focus:border-neon-green focus:ring-1 focus:ring-neon-green/30 focus:outline-none transition-colors"
                >
                  {CHAINS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Alert type */}
              <div>
                <label className="block text-xs font-mono text-text-secondary mb-1.5">
                  Alert Type
                </label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as AlertType)}
                  className="w-full bg-bg-card border border-border rounded-lg px-4 py-2.5 text-text-primary font-mono text-sm focus:border-neon-green focus:ring-1 focus:ring-neon-green/30 focus:outline-none transition-colors"
                >
                  {ALERT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Threshold */}
              <div>
                <label className="block text-xs font-mono text-text-secondary mb-1.5">
                  Threshold ({getThresholdUnit(alertType)})
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder={
                    alertType === "safety_drop"
                      ? "e.g. 40 (score 0-100)"
                      : alertType === "holder_drop"
                        ? "e.g. 20 (% drop)"
                        : alertType === "whale_move"
                          ? "e.g. 100 (SOL amount)"
                          : "e.g. 0.001"
                  }
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </div>
            </div>

            {/* Error / Success messages */}
            {formError && (
              <p className="text-xs font-mono text-neon-red">{formError}</p>
            )}
            {formSuccess && (
              <p className="text-xs font-mono text-neon-green">{formSuccess}</p>
            )}

            <Button type="submit" loading={creating} size="md">
              <Plus className="w-4 h-4" />
              Create Alert
            </Button>
          </form>
        </Card>

        {/* Active Alerts List */}
        <Card>
          <h2 className="font-mono font-semibold text-sm text-text-primary uppercase tracking-wider mb-4">
            Active Alerts
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-10 h-10 text-text-dim mx-auto mb-3" />
              <p className="font-mono text-sm text-text-secondary">
                No alerts yet. Create one above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-3 bg-bg-card rounded-lg border border-border"
                >
                  {/* Token + chain */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-text-primary">
                        {shortenAddress(alert.token_address)}
                      </span>
                      <Badge variant="chain" chain={alert.chain}>
                        {""}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getAlertTypeBadgeVariant(alert.alert_type)}>
                        {getAlertTypeLabel(alert.alert_type)}
                      </Badge>
                      <span className="text-xs font-mono text-text-dim">
                        Threshold: {alert.threshold?.value ?? "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Enable/Disable toggle */}
                  <button
                    onClick={() => handleToggle(alert.id, alert.enabled)}
                    disabled={togglingId === alert.id}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold uppercase tracking-wider transition-all ${
                      alert.enabled
                        ? "bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20"
                        : "bg-bg-hover text-text-dim border border-border hover:text-text-secondary"
                    } ${togglingId === alert.id ? "opacity-50" : ""}`}
                  >
                    {alert.enabled ? "ON" : "OFF"}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(alert.id)}
                    disabled={deletingId === alert.id}
                    className={`p-2 rounded-md text-text-dim hover:text-neon-red hover:bg-neon-red/10 transition-colors ${
                      deletingId === alert.id ? "opacity-50" : ""
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

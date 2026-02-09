// Position selector tabs — TODO: implement full UI from mockup
"use client";
import type { Position } from "@/types";

interface Props {
  positions: Position[];
  selected: number;
  onSelect: (index: number) => void;
}

export function PositionTabs({ positions, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
      {positions.map((pos, i) => (
        <button key={i} onClick={() => onSelect(i)}
          className={`px-4 py-3 rounded-lg border font-mono text-sm transition-all ${
            selected === i ? "border-neon-green bg-neon-green/5 text-text-primary" : "border-border bg-bg-panel text-text-secondary"
          }`}>
          {pos.name} ({pos.ticker})
        </button>
      ))}
    </div>
  );
}

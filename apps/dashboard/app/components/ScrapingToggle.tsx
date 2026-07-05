"use client";

import { useState, useTransition } from "react";
import { setScrapingEnabled } from "@/app/actions";

export function ScrapingToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      try {
        await setScrapingEnabled(next);
      } catch {
        setEnabled(!next);
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      aria-pressed={enabled}
      className={`flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left w-full transition-opacity ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-surface transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
      <span>
        <span className="block font-medium">
          Scraping {enabled ? "aktiv" : "pausiert"}
        </span>
        <span className="block text-sm text-muted-foreground">
          {enabled
            ? "Sucht laufend nach neuen Angeboten"
            : "Keine Anfragen an Vinted, kein Risiko"}
        </span>
      </span>
    </button>
  );
}

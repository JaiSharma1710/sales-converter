"use client";

import { useCallback, useState } from "react";
import type { Mappings, MissingMapping } from "@/types/mappings";
import { ExcelUpload } from "./excel-upload";
import { MAPPING_CONFIGS, toFormValues } from "./mappings/mapping-config";
import {
  MappingSettingsModal,
  type MappingSettingsView,
} from "./mappings/mapping-settings-modal";

type SalesImportProps = {
  mappings: Mappings;
};

export function SalesImport({ mappings }: SalesImportProps) {
  const [settingsView, setSettingsView] =
    useState<MappingSettingsView | null>(null);
  const closeSettings = useCallback(() => setSettingsView(null), []);

  const addMapping = (missingMapping: MissingMapping) => {
    setSettingsView({
      kind: missingMapping.kind,
      mode: "form",
      values: toFormValues(
        MAPPING_CONFIGS[missingMapping.kind],
        missingMapping.values,
      ),
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-950">
      <header inert={settingsView !== null} className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white"
            >
              SI
            </span>
            <span className="truncate text-sm font-semibold text-neutral-950">
              Amazon Sales Import
            </span>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            onClick={() => setSettingsView({ kind: "site", mode: "list" })}
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Mappings
          </button>
        </div>
      </header>

      <main inert={settingsView !== null} className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 sm:px-8 sm:py-14">
        <ExcelUpload
          mappings={mappings}
          onAddMapping={addMapping}
          onOpenSettings={(kind) => setSettingsView({ kind, mode: "list" })}
        />
      </main>

      {settingsView ? (
        <MappingSettingsModal
          key={JSON.stringify(settingsView)}
          initialView={settingsView}
          mappings={mappings}
          onClose={closeSettings}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { MappingKind, Mappings } from "@/types/mappings";
import { primaryButton, textInput } from "@/components/ui/styles";
import {
  MAPPING_CONFIGS,
  MAPPING_KINDS,
  toFormValues,
  type FormValues,
  type MappingRow,
} from "./mapping-config";
import { MappingForm } from "./mapping-form";

export type MappingSettingsView =
  | { mode: "list"; kind: MappingKind }
  | { mode: "form"; kind: MappingKind; editingId?: number; values: FormValues };

type MappingSettingsModalProps = {
  mappings: Mappings;
  initialView: MappingSettingsView;
  onClose: () => void;
};

const ALL_SITES = "";

export function MappingSettingsModal({
  initialView,
  mappings,
  onClose,
}: MappingSettingsModalProps) {
  const [view, setView] = useState(initialView);
  const [query, setQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState(ALL_SITES);
  const [notice, setNotice] = useState<string | null>(null);
  const config = MAPPING_CONFIGS[view.kind];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return config.getRows(mappings).filter((row) => {
      if (config.kind === "customer" && siteFilter && row.siteCode !== siteFilter) {
        return false;
      }

      return (
        !normalizedQuery ||
        config.columns.some((column) =>
          String(row[column.key]).toLowerCase().includes(normalizedQuery),
        )
      );
    });
  }, [config, mappings, query, siteFilter]);

  const switchKind = (kind: MappingKind) => {
    setView({ kind, mode: "list" });
    setQuery("");
    setSiteFilter(ALL_SITES);
    setNotice(null);
  };

  const openForm = (row?: MappingRow) => {
    setNotice(null);
    setView({
      editingId: row?.id,
      kind: view.kind,
      mode: "form",
      values: toFormValues(config, {
        siteCode: config.kind === "customer" ? siteFilter : undefined,
        ...row,
      }),
    });
  };

  return (
    <div
      aria-labelledby="mapping-settings-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-neutral-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[85vh] sm:rounded-xl">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 pb-0 pt-5">
          <div className="min-w-0">
            <h2
              id="mapping-settings-title"
              className="text-xl font-semibold text-neutral-950"
            >
              Mapping settings
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Changes apply right away to the file you are converting.
            </p>

            <nav className="-mb-px mt-4 flex gap-1 overflow-x-auto" aria-label="Mapping types">
              {MAPPING_KINDS.map((kind) => {
                const tabConfig = MAPPING_CONFIGS[kind];
                const isActive = view.kind === kind;

                return (
                  <button
                    key={kind}
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                      isActive
                        ? "border-teal-600 text-teal-800"
                        : "border-transparent text-neutral-600 hover:text-neutral-950",
                    ].join(" ")}
                    onClick={() => switchKind(kind)}
                  >
                    {tabConfig.pluralLabel}
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs",
                        isActive
                          ? "bg-teal-100 text-teal-800"
                          : "bg-neutral-100 text-neutral-600",
                      ].join(" ")}
                    >
                      {tabConfig.getRows(mappings).length}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <button
            type="button"
            aria-label="Close mapping settings"
            className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            onClick={onClose}
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {view.mode === "form" ? (
          <MappingForm
            key={`${view.kind}-${view.editingId ?? "new"}`}
            config={config}
            editingId={view.editingId}
            initialValues={view.values}
            mappings={mappings}
            onCancel={() => setView({ kind: view.kind, mode: "list" })}
            onDone={(message) => {
              setNotice(message);
              setView({ kind: view.kind, mode: "list" });
            }}
          />
        ) : (
          <>
            <p className="px-6 pt-4 text-sm text-neutral-600">
              {config.description}
            </p>
            <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  aria-label={`Search ${config.pluralLabel.toLowerCase()}`}
                  className={`${textInput} pl-9`}
                  placeholder={`Search ${config.pluralLabel.toLowerCase()}...`}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>

              {config.kind === "customer" ? (
                <select
                  aria-label="Filter by site"
                  className={`${textInput} sm:w-56`}
                  value={siteFilter}
                  onChange={(event) => setSiteFilter(event.target.value)}
                >
                  <option value={ALL_SITES}>All sites</option>
                  {mappings.sites.map((site) => (
                    <option key={site.id} value={site.siteCode}>
                      {site.siteCode} · {site.state}
                    </option>
                  ))}
                </select>
              ) : null}

              <button
                type="button"
                className={primaryButton}
                onClick={() => openForm()}
              >
                <span aria-hidden="true">+</span> Add {config.label.toLowerCase()}
              </button>
            </div>

            {notice ? (
              <p
                role="status"
                className="mx-6 mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800"
              >
                {notice}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-auto border-t border-neutral-200">
              <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    {config.columns.map((column) => (
                      <th
                        key={column.key}
                        className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500"
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 px-6 py-2.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="group cursor-pointer hover:bg-teal-50/50"
                      onClick={() => openForm(row)}
                    >
                      {config.columns.map((column) => (
                        <td
                          key={column.key}
                          className={[
                            "max-w-72 truncate border-b border-neutral-100 px-6 py-2.5",
                            column.muted
                              ? "text-neutral-500"
                              : "font-mono text-neutral-900",
                          ].join(" ")}
                        >
                          {String(row[column.key]) || "—"}
                        </td>
                      ))}
                      <td className="border-b border-neutral-100 px-6 py-2.5 text-right">
                        <button
                          type="button"
                          aria-label={`Edit ${config.getTitle(row)}`}
                          className="rounded-md px-2 py-1 text-sm font-semibold text-teal-700 opacity-70 transition-opacity hover:bg-teal-100 group-hover:opacity-100 focus:opacity-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            openForm(row);
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {rows.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-neutral-500">
                  No {config.pluralLabel.toLowerCase()} match your search.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

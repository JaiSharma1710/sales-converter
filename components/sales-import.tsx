"use client";

import { useMemo, useState } from "react";
import { logout } from "@/app/actions/auth";
import {
  readAmazonReport,
  type AmazonReportResult,
  type WarehouseGroup,
} from "@/lib/import/amazon-report";
import { buildSalesOrder, type SalesOrder } from "@/lib/import/build-sales-order";
import type { Problem } from "@/lib/import/problem";
import { readWorkbook } from "@/lib/import/sheet";
import {
  checkSkuMaster,
  readSkuMaster,
  type SkuMasterKind,
  type SkuMasterResult,
} from "@/lib/import/sku-master";
import { stateKey } from "@/lib/import/states";
import { expectedSiteCode } from "@/lib/import/warehouse-codes";
import {
  checkWarehouseFile,
  readWarehouseFile,
  type WarehouseFileResult,
} from "@/lib/import/warehouse-file";
import { FilePicker } from "./file-picker";
import { ProblemList } from "./problem-list";
import { Step } from "./step";
import { Say } from "./ui/say";
import { primaryButton, secondaryButton } from "./ui/styles";
import { WorkbookPreview } from "./workbook-preview";

type Loaded<T> = { fileName: string; result: T };

/** Opens an Excel file, or returns the problem to show instead. */
async function openWorkbook(file: File) {
  const problem = (title: Problem["title"], fix: Problem["fix"]): Problem => ({
    fix,
    title,
    where: { file: file.name },
  });

  if (!/\.xlsx?$/i.test(file.name)) {
    return {
      problem: problem(
        { en: "This is not an Excel file.", hi: "यह Excel फ़ाइल नहीं है।" },
        {
          en: "Choose a file that ends with .xlsx or .xls.",
          hi: ".xlsx या .xls वाली फ़ाइल चुनें।",
        },
      ),
    };
  }

  try {
    return { workbook: readWorkbook(await file.arrayBuffer()) };
  } catch {
    return {
      problem: problem(
        { en: "This file could not be opened.", hi: "यह फ़ाइल खुल नहीं पाई।" },
        {
          en: "Open it in Excel, use Save As → Excel Workbook (.xlsx), and upload the new file.",
          hi: "इसे Excel में खोलें, Save As → Excel Workbook (.xlsx) से सेव करें, और नई फ़ाइल अपलोड करें।",
        },
      ),
    };
  }
}

const SKU_STEP_FILES: { kind: SkuMasterKind; label: { en: string; hi: string }; example: string }[] = [
  {
    example: "ECOM PRODUCT CODE MASTER.xlsx",
    kind: "product",
    label: { en: "Product code file", hi: "प्रोडक्ट कोड फ़ाइल" },
  },
  {
    example: "ECOM DIVISION MASTER.xlsx",
    kind: "division",
    label: { en: "Division file", hi: "डिवीज़न फ़ाइल" },
  },
];

type SalesImportProps = {
  canSignOut: boolean;
};

export function SalesImport({ canSignOut }: SalesImportProps) {
  const [amazon, setAmazon] = useState<Loaded<AmazonReportResult> | null>(null);
  const [skuFiles, setSkuFiles] = useState<
    Partial<Record<SkuMasterKind, Loaded<SkuMasterResult>>>
  >({});
  const [warehouseFiles, setWarehouseFiles] = useState<
    Record<string, Loaded<WarehouseFileResult>>
  >({});
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const report = amazon?.result.ok ? amazon.result.report : null;

  const skuChecks = useMemo(() => {
    const check = (kind: SkuMasterKind) => {
      const loaded = skuFiles[kind];

      if (!report || !loaded?.result.ok) {
        return null;
      }

      return checkSkuMaster(loaded.result.master, report.orders);
    };

    return { division: check("division"), product: check("product") };
  }, [report, skuFiles]);

  const products =
    skuChecks.product?.problems.length === 0 ? skuChecks.product.lookup : null;
  const divisions =
    skuChecks.division?.problems.length === 0 ? skuChecks.division.lookup : null;
  const step2Done = products !== null && divisions !== null;

  const warehouseResults = useMemo(() => {
    const results = new Map<
      string,
      { problems: Problem[]; order: SalesOrder | null }
    >();

    if (!report || !products || !divisions) {
      return results;
    }

    for (const group of report.warehouses) {
      const loaded = warehouseFiles[group.key];

      if (!loaded) {
        continue;
      }

      if (!loaded.result.ok) {
        results.set(group.key, { order: null, problems: loaded.result.problems });
        continue;
      }

      const file = loaded.result.file;
      const check = checkWarehouseFile(file, group);

      results.set(group.key, {
        order:
          check.problems.length === 0
            ? buildSalesOrder(group, file.siteCode, products, divisions, check.lookup)
            : null,
        problems: check.problems,
      });
    }

    return results;
  }, [divisions, products, report, warehouseFiles]);

  const loadAmazon = async (file: File) => {
    setBusy("amazon");
    const opened = await openWorkbook(file);

    setAmazon({
      fileName: file.name,
      result: opened.workbook
        ? readAmazonReport(opened.workbook, file.name)
        : { ok: false, problems: [opened.problem] },
    });
    setBusy(null);
  };

  const loadSkuFile = async (kind: SkuMasterKind, file: File) => {
    setBusy(kind);
    const opened = await openWorkbook(file);

    setSkuFiles((previous) => ({
      ...previous,
      [kind]: {
        fileName: file.name,
        result: opened.workbook
          ? readSkuMaster(kind, opened.workbook, file.name)
          : { ok: false, problems: [opened.problem] },
      },
    }));
    setBusy(null);
  };

  const loadWarehouseFile = async (groupKey: string, file: File) => {
    setBusy(groupKey);
    const opened = await openWorkbook(file);

    setWarehouseFiles((previous) => ({
      ...previous,
      [groupKey]: {
        fileName: file.name,
        result: opened.workbook
          ? readWarehouseFile(opened.workbook, file.name)
          : { ok: false, problems: [opened.problem] },
      },
    }));
    setBusy(null);
  };

  /** Puts each file in the box of the state it belongs to. */
  const loadAllWarehouseFiles = async (files: File[]) => {
    if (!report) {
      return;
    }

    setBusy("all-warehouses");
    const assigned: Record<string, Loaded<WarehouseFileResult>> = {};
    const notNeeded: string[] = [];
    const unknown: string[] = [];

    for (const file of files) {
      const opened = await openWorkbook(file);
      const result = opened.workbook
        ? readWarehouseFile(opened.workbook, file.name)
        : null;
      const homeState = result?.ok ? result.file.homeState : null;

      if (!result?.ok || !homeState) {
        unknown.push(file.name);
        continue;
      }

      const group = report.warehouses.find(
        (candidate) => candidate.key === stateKey(homeState),
      );

      if (group) {
        assigned[group.key] = { fileName: file.name, result };
      } else {
        notNeeded.push(`${file.name} (${homeState})`);
      }
    }

    setWarehouseFiles((previous) => ({ ...previous, ...assigned }));
    setBulkMessage(
      [
        `${Object.keys(assigned).length} files placed in their boxes. / ${Object.keys(assigned).length} फ़ाइलें अपने बॉक्स में लग गईं।`,
        notNeeded.length > 0
          ? `Not needed for this report / इस रिपोर्ट के लिए ज़रूरी नहीं: ${notNeeded.join(", ")}`
          : "",
        unknown.length > 0
          ? `Could not tell which warehouse these are — upload them in the right box below / ये किस वेयरहाउस की हैं, पता नहीं चला — नीचे सही बॉक्स में अपलोड करें: ${unknown.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    setBusy(null);
  };

  const previewGroup = report?.warehouses.find((group) => group.key === previewKey);
  const previewOrder = previewKey ? warehouseResults.get(previewKey)?.order : null;

  if (previewGroup && previewOrder) {
    return (
      <Shell canSignOut={canSignOut}>
        <WorkbookPreview
          order={previewOrder}
          onBack={() => setPreviewKey(null)}
        />
      </Shell>
    );
  }

  const readyCount = report
    ? report.warehouses.filter((group) => warehouseResults.get(group.key)?.order)
        .length
    : 0;

  return (
    <Shell canSignOut={canSignOut}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-950 sm:text-4xl">
          <Say en="Amazon sales to sales order files" hi="Amazon सेल्स से सेल्स ऑर्डर फ़ाइल" />
        </h1>
        <p className="mt-3 text-lg text-neutral-700">
          <Say
            en="Follow the steps from top to bottom. Nothing is saved — if you close this page, start again."
            hi="ऊपर से नीचे चरण पूरे करें। कुछ भी सेव नहीं होता — पेज बंद करने पर दोबारा शुरू करें।"
          />
        </p>
      </div>

      <div className="grid gap-6">
        <Step
          number={1}
          done={report !== null}
          title={{ en: "Upload the Amazon sales report", hi: "Amazon सेल्स रिपोर्ट अपलोड करें" }}
        >
          <FilePicker
            busy={busy === "amazon"}
            fileName={amazon?.fileName}
            label={{ en: "Choose Amazon file", hi: "Amazon फ़ाइल चुनें" }}
            onFiles={([file]) => void loadAmazon(file)}
          />
          {amazon && !amazon.result.ok ? (
            <ProblemList problems={amazon.result.problems} />
          ) : null}
          {report ? (
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-lg text-emerald-900">
              <Say
                en={`✓ ${report.orders.length} orders found, from ${report.warehouses.length} warehouses.${report.skippedCount > 0 ? ` ${report.skippedCount} refund/replacement rows are left out.` : ""}`}
                hi={`✓ ${report.orders.length} ऑर्डर मिले, ${report.warehouses.length} वेयरहाउस से।${report.skippedCount > 0 ? ` ${report.skippedCount} रिफ़ंड/रिप्लेसमेंट लाइनें छोड़ दी गईं।` : ""}`}
              />
            </p>
          ) : null}
        </Step>

        <Step
          number={2}
          done={step2Done}
          locked={!report}
          title={{ en: "Upload the product and division files", hi: "प्रोडक्ट और डिवीज़न फ़ाइल अपलोड करें" }}
        >
          <div className="grid gap-6">
            {SKU_STEP_FILES.map(({ example, kind, label }) => {
              const loaded = skuFiles[kind];
              const check = skuChecks[kind];
              const problems = loaded?.result.ok === false
                ? loaded.result.problems
                : (check?.problems ?? []);

              return (
                <div key={kind}>
                  <h3 className="text-xl font-semibold text-neutral-900">
                    <Say en={label.en} hi={label.hi} />
                  </h3>
                  <p className="mb-2 text-base text-neutral-600">
                    Usually named / आमतौर पर नाम: “{example}”
                  </p>
                  <FilePicker
                    busy={busy === kind}
                    fileName={loaded?.fileName}
                    label={{ en: `Choose ${label.en.toLowerCase()}`, hi: `${label.hi} चुनें` }}
                    onFiles={([file]) => void loadSkuFile(kind, file)}
                  />
                  <ProblemList problems={problems} />
                  {check && check.problems.length === 0 ? (
                    <p className="mt-3 text-lg font-semibold text-emerald-800">
                      <Say
                        en="✓ All products in the Amazon report were found."
                        hi="✓ Amazon रिपोर्ट के सभी प्रोडक्ट मिल गए।"
                      />
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Step>

        <Step
          number={3}
          done={report !== null && readyCount === report.warehouses.length}
          locked={!step2Done}
          title={{ en: "Upload the warehouse files", hi: "वेयरहाउस फ़ाइलें अपलोड करें" }}
        >
          {report ? (
            <>
              <p className="text-lg text-neutral-800">
                <Say
                  en={`This report needs ${report.warehouses.length} warehouse files, one for each state below. Upload each file in its box.`}
                  hi={`इस रिपोर्ट के लिए ${report.warehouses.length} वेयरहाउस फ़ाइलें चाहिए, नीचे हर स्टेट के लिए एक। हर फ़ाइल उसके बॉक्स में अपलोड करें।`}
                />
              </p>
              <div className="mt-4 rounded-xl bg-neutral-50 p-4">
                <p className="mb-2 text-base text-neutral-700">
                  <Say
                    en="Shortcut: select all warehouse files together, and each goes into its own box."
                    hi="आसान तरीका: सारी वेयरहाउस फ़ाइलें एक साथ चुनें, हर फ़ाइल अपने-आप सही बॉक्स में चली जाएगी।"
                  />
                </p>
                <FilePicker
                  multiple
                  busy={busy === "all-warehouses"}
                  label={{ en: "Choose all warehouse files", hi: "सारी वेयरहाउस फ़ाइलें चुनें" }}
                  onFiles={(files) => void loadAllWarehouseFiles(files)}
                />
                {bulkMessage ? (
                  <p className="mt-3 whitespace-pre-line text-base text-neutral-800">
                    {bulkMessage}
                  </p>
                ) : null}
              </div>

              <ol className="mt-6 grid gap-4">
                {report.warehouses.map((group) => (
                  <WarehouseCard
                    key={group.key}
                    busy={busy === group.key}
                    group={group}
                    loaded={warehouseFiles[group.key]}
                    result={warehouseResults.get(group.key)}
                    onFile={(file) => void loadWarehouseFile(group.key, file)}
                    onOpen={() => {
                      setPreviewKey(group.key);
                      window.scrollTo(0, 0);
                    }}
                  />
                ))}
              </ol>
            </>
          ) : null}
        </Step>
      </div>
    </Shell>
  );
}

type WarehouseCardProps = {
  group: WarehouseGroup;
  loaded?: Loaded<WarehouseFileResult>;
  result?: { problems: Problem[]; order: SalesOrder | null };
  busy: boolean;
  onFile: (file: File) => void;
  onOpen: () => void;
};

function WarehouseCard({ busy, group, loaded, onFile, onOpen, result }: WarehouseCardProps) {
  const ready = result?.order != null;
  const expectedCode = expectedSiteCode(group.state);
  const siteCode = loaded?.result.ok
    ? loaded.result.file.siteCode
    : expectedCode;

  return (
    <li
      className={[
        "rounded-xl border-2 p-4 sm:p-5",
        ready
          ? "border-emerald-300 bg-emerald-50/50"
          : result && result.problems.length > 0
            ? "border-red-200"
            : "border-neutral-200",
      ].join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex flex-wrap items-center gap-3 text-2xl font-bold text-neutral-950">
          {group.state}
          {siteCode ? (
            <span className="rounded-lg bg-neutral-900 px-2.5 py-0.5 font-mono text-lg font-semibold text-white">
              {siteCode}
            </span>
          ) : null}
        </h3>
        <p className="text-lg text-neutral-700">
          {group.orders.length} orders / ऑर्डर
        </p>
      </div>
      {!loaded && expectedCode ? (
        <p className="mb-3 text-base text-neutral-700">
          <Say
            en={`Choose the file that has “${expectedCode}” in its name.`}
            hi={`वह फ़ाइल चुनें जिसके नाम में “${expectedCode}” लिखा हो।`}
          />
        </p>
      ) : null}

      <FilePicker
        busy={busy}
        fileName={loaded?.fileName}
        label={{
          en: `Choose ${group.state} warehouse file`,
          hi: `${group.state} वेयरहाउस फ़ाइल चुनें`,
        }}
        onFiles={([file]) => onFile(file)}
      />

      {result ? <ProblemList problems={result.problems} /> : null}

      {ready ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-lg font-semibold text-emerald-800">
            <Say
              en="✓ All good. The sales order file is ready."
              hi="✓ सब ठीक है। सेल्स ऑर्डर फ़ाइल तैयार है।"
            />
          </p>
          <button type="button" className={primaryButton} onClick={onOpen}>
            <Say en="Open file" hi="फ़ाइल खोलें" className="text-left leading-tight" />
          </button>
        </div>
      ) : null}
    </li>
  );
}

function Shell({
  canSignOut,
  children,
}: {
  canSignOut: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-100 text-neutral-950">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-teal-700 text-base font-bold text-white"
            >
              SI
            </span>
            <span className="truncate text-lg font-semibold">Amazon Sales Import</span>
          </div>
          {canSignOut ? (
            <form action={logout}>
              <button type="submit" className={secondaryButton}>
                <Say en="Sign out" hi="साइन आउट" className="text-left text-base leading-tight" />
              </button>
            </form>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { secondaryButton, primaryButton } from "./ui/styles";

type FilePickerProps = {
  label: { en: string; hi: string };
  /** The file currently in use, if any. */
  fileName?: string;
  busy?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
};

/** A big button that also accepts a dragged file. */
export function FilePicker({
  busy = false,
  fileName,
  label,
  multiple = false,
  onFiles,
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      className={[
        "flex flex-col items-start gap-3 rounded-xl border-2 border-dashed p-4 sm:flex-row sm:items-center",
        isDragging ? "border-teal-600 bg-teal-50" : "border-neutral-300 bg-neutral-50",
      ].join(" ")}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const files = Array.from(event.dataTransfer.files);

        if (files.length > 0) {
          onFiles(multiple ? files : files.slice(0, 1));
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);

          if (files.length > 0) {
            onFiles(files);
          }

          event.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        className={fileName ? secondaryButton : primaryButton}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <svg
          aria-hidden="true"
          className="h-6 w-6 flex-none"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M12 16V4m-5 5 5-5 5 5" />
          <path d="M20 16.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5" />
        </svg>
        <span className="text-left leading-tight">
          <span className="block">{fileName ? "Change file" : label.en}</span>
          <span lang="hi" className="block text-base font-medium opacity-90">
            {fileName ? "फ़ाइल बदलें" : label.hi}
          </span>
        </span>
      </button>
      <p className="min-w-0 break-all text-base text-neutral-700">
        {busy
          ? "Reading the file… / फ़ाइल पढ़ी जा रही है…"
          : (fileName ?? "or drag the file here / या फ़ाइल यहाँ खींचकर छोड़ें")}
      </p>
    </div>
  );
}

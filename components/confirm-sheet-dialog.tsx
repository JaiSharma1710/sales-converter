type ConfirmSheetDialogProps = {
  sheetName: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmSheetDialog({
  sheetName,
  onCancel,
  onConfirm,
}: ConfirmSheetDialogProps) {
  if (!sheetName) {
    return null;
  }

  return (
    <div
      aria-labelledby="confirm-sheet-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2
          id="confirm-sheet-title"
          className="text-xl font-semibold text-neutral-950"
        >
          Use &quot;{sheetName}&quot; sheet?
        </h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Are you sure this is the sheet containing the main Amazon sales data?
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            onClick={onConfirm}
          >
            Yes, Continue
          </button>
        </div>
      </div>
    </div>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export const primaryButton = `${BUTTON_BASE} bg-teal-600 text-white shadow-sm hover:bg-teal-700`;

export const secondaryButton = `${BUTTON_BASE} border border-neutral-200 bg-white text-neutral-800 shadow-sm hover:bg-neutral-50`;

export const dangerButton = `${BUTTON_BASE} bg-red-600 text-white shadow-sm hover:bg-red-700`;

export const textInput =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm placeholder:text-neutral-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:bg-neutral-100";

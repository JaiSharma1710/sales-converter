const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-lg font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButton = `${BUTTON_BASE} bg-teal-700 text-white shadow-sm hover:bg-teal-800`;

export const secondaryButton = `${BUTTON_BASE} border-2 border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100`;

export const textInput =
  "w-full rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-lg text-neutral-950 placeholder:text-neutral-400 focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-500/30 disabled:bg-neutral-100";

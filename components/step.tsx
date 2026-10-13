import type { ReactNode } from "react";
import type { Bilingual } from "@/lib/import/problem";
import { Say } from "./ui/say";

type StepProps = {
  number: number;
  title: Bilingual;
  done: boolean;
  /** Earlier steps aren't finished yet. */
  locked?: boolean;
  children?: ReactNode;
};

export function Step({ children, done, locked = false, number, title }: StepProps) {
  return (
    <section
      className={[
        "rounded-2xl border-2 bg-white p-5 shadow-sm sm:p-7",
        done ? "border-emerald-300" : "border-neutral-200",
        locked ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <span
          className={[
            "flex h-12 w-12 flex-none items-center justify-center rounded-full text-2xl font-bold",
            done ? "bg-emerald-600 text-white" : "bg-neutral-900 text-white",
          ].join(" ")}
          aria-hidden="true"
        >
          {done ? "✓" : number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold uppercase tracking-wide text-neutral-500">
            Step {number} / चरण {number}
          </p>
          <h2 className="text-2xl font-bold text-neutral-950">
            <Say en={title.en} hi={title.hi} />
          </h2>
        </div>
      </div>
      {locked ? (
        <p className="mt-4 text-lg text-neutral-600">
          <Say
            en="Finish the step above first."
            hi="पहले ऊपर वाला चरण पूरा करें।"
          />
        </p>
      ) : (
        <div className="mt-5">{children}</div>
      )}
    </section>
  );
}

import type { Bilingual } from "@/lib/import/problem";

type SayProps = Bilingual & {
  className?: string;
};

/** English on the first line, Hindi under it. */
export function Say({ className, en, hi }: SayProps) {
  return (
    <span className={className}>
      <span className="block">{en}</span>
      <span lang="hi" className="block opacity-80">
        {hi}
      </span>
    </span>
  );
}

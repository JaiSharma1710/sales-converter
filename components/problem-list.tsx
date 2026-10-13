import { formatRowList } from "@/lib/import/sheet";
import type { Problem } from "@/lib/import/problem";
import { Say } from "./ui/say";

type ProblemListProps = {
  problems: Problem[];
};

export function ProblemList({ problems }: ProblemListProps) {
  if (problems.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <p className="mb-3 text-lg font-semibold text-red-800">
        <Say
          en={`${problems.length} ${problems.length === 1 ? "thing needs" : "things need"} fixing:`}
          hi={`${problems.length} ${problems.length === 1 ? "चीज़" : "चीज़ें"} ठीक करनी हैं:`}
        />
      </p>
      <ol className="grid gap-3">
        {problems.map((problem, index) => (
          <li
            key={index}
            className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-base text-neutral-900"
          >
            <div className="flex gap-3">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-red-600 text-base font-bold text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Say
                  className="text-lg font-semibold text-red-900"
                  en={problem.title.en}
                  hi={problem.title.hi}
                />

                {problem.where ? (
                  <dl className="mt-3 grid gap-1 rounded-lg bg-white px-3 py-2 text-base sm:grid-cols-[auto_1fr] sm:gap-x-4">
                    <dt className="font-semibold text-neutral-600">File / फ़ाइल</dt>
                    <dd className="break-all">{problem.where.file}</dd>
                    {problem.where.sheet ? (
                      <>
                        <dt className="font-semibold text-neutral-600">Sheet / शीट</dt>
                        <dd className="break-all">{problem.where.sheet}</dd>
                      </>
                    ) : null}
                    {problem.where.rows && problem.where.rows.length > 0 ? (
                      <>
                        <dt className="font-semibold text-neutral-600">Row / पंक्ति</dt>
                        <dd>{formatRowList(problem.where.rows)}</dd>
                      </>
                    ) : null}
                    {problem.where.column ? (
                      <>
                        <dt className="font-semibold text-neutral-600">Column / कॉलम</dt>
                        <dd>{problem.where.column}</dd>
                      </>
                    ) : null}
                  </dl>
                ) : null}

                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="font-semibold text-emerald-900">
                    How to fix / कैसे ठीक करें
                  </p>
                  <Say
                    className="mt-1 text-emerald-950"
                    en={problem.fix.en}
                    hi={problem.fix.hi}
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

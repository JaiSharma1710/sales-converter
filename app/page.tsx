import { ExcelUpload } from "@/components/excel-upload";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-950">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-6 py-16 sm:px-8 sm:py-24">
        <div className="mb-10 max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-normal text-neutral-950 sm:text-5xl">
            Amazon Sales Import
          </h1>
          <p className="mt-4 text-base leading-7 text-neutral-600 sm:text-lg">
            Upload your Amazon sales Excel file to get started.
          </p>
        </div>

        <ExcelUpload />
      </main>
    </div>
  );
}

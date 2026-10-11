import { redirect } from "next/navigation";
import { getAuthStatus } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const status = await getAuthStatus();

  if (status === "authenticated") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-neutral-950">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white"
        >
          SI
        </span>
        <h1 className="mt-5 text-2xl font-semibold">Amazon Sales Import</h1>

        {status === "misconfigured" ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            Sign-in is not configured. Set the APP_PASSWORD environment
            variable and redeploy.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-neutral-600">
              Enter the team password to continue.
            </p>
            <LoginForm />
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { primaryButton, textInput } from "@/components/ui/styles";

const INITIAL_STATE: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, INITIAL_STATE);

  return (
    <form action={formAction} className="mt-6">
      <label
        htmlFor="password"
        className="block text-sm font-semibold text-neutral-800"
      >
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        aria-describedby={state.error ? "password-error" : undefined}
        aria-invalid={Boolean(state.error)}
        className={`${textInput} mt-1.5`}
        disabled={isPending}
      />
      {state.error ? (
        <p
          id="password-error"
          role="alert"
          className="mt-1.5 text-sm font-medium text-red-700"
        >
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        className={`${primaryButton} mt-5 w-full`}
        disabled={isPending}
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

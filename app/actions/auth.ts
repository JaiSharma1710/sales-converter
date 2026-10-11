"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  isPasswordCorrect,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

export type LoginState = { error: string | null };

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password");

  if (typeof password !== "string" || !isPasswordCorrect(password)) {
    // Slow down password guessing.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { error: "Incorrect password." };
  }

  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);

  redirect("/login");
}

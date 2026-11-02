"use server";

import { sanitizeCallbackUrl, signIn } from "@/shared/auth";

import { isAuthProviderId } from "../model/providers";

export async function signInWithProvider(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  if (!isAuthProviderId(provider)) {
    throw new Error("Unknown sign-in provider");
  }
  const callbackUrl = formData.get("callbackUrl");
  await signIn(provider, {
    redirectTo: sanitizeCallbackUrl(
      typeof callbackUrl === "string" ? callbackUrl : undefined,
    ),
  });
}

"use server";

import { signOut } from "@/shared/auth";

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

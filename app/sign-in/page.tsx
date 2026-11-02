import type { Metadata } from "next";

import { SignInPage } from "@/pages/sign-in";

export const metadata: Metadata = { title: "Sign in" };

export default function Page({ searchParams }: PageProps<"/sign-in">) {
  return <SignInPage searchParams={searchParams} />;
}

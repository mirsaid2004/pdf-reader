import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getSignInErrorMessage, SignInButtons } from "@/features/auth/sign-in";
import { getCurrentUser, sanitizeCallbackUrl } from "@/shared/auth";
import { LoadingRegion, Skeleton } from "@/shared/ui/skeleton";

type SearchParams = Record<string, string | string[] | undefined>;

async function SignInPanel({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl);

  if (await getCurrentUser()) redirect(callbackUrl);

  const error = getSignInErrorMessage(params.error);

  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}
      <SignInButtons callbackUrl={callbackUrl} />
    </>
  );
}

export function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-2xl border border-foreground/10 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Your books, progress, and highlights — on every device.
          </p>
        </div>
        <Suspense
          fallback={
            <LoadingRegion
              label="Loading sign-in options"
              className="flex flex-col gap-3"
            >
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </LoadingRegion>
          }
        >
          <SignInPanel searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

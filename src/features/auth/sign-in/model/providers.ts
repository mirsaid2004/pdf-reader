export const AUTH_PROVIDERS = [
  { id: "google", label: "Continue with Google" },
  { id: "github", label: "Continue with GitHub" },
] as const;

export type AuthProviderId = (typeof AUTH_PROVIDERS)[number]["id"];

export function isAuthProviderId(value: unknown): value is AuthProviderId {
  return AUTH_PROVIDERS.some((provider) => provider.id === value);
}

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is already linked to a different sign-in method. Please use the provider you signed up with.",
  AccessDenied: "Access was denied. Please try again.",
  Configuration:
    "Sign-in is temporarily unavailable due to a server configuration problem.",
};

/** Maps an Auth.js `?error=` code to a user-facing message. */
export function getSignInErrorMessage(
  code: string | string[] | undefined,
): string | null {
  const value = Array.isArray(code) ? code[0] : code;
  if (!value) return null;
  return (
    ERROR_MESSAGES[value] ??
    "Something went wrong while signing in. Please try again."
  );
}

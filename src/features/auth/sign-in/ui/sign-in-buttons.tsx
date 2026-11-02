import { signInWithProvider } from "../api/sign-in-action";
import { AUTH_PROVIDERS } from "../model/providers";
import { ProviderIcon } from "./provider-icon";

export function SignInButtons({ callbackUrl }: { callbackUrl: string }) {
  return (
    <div className="flex flex-col gap-3">
      {AUTH_PROVIDERS.map((provider) => (
        <form key={provider.id} action={signInWithProvider}>
          <input type="hidden" name="provider" value={provider.id} />
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-foreground/15 px-4 py-2.5 font-medium transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ProviderIcon provider={provider.id} />
            {provider.label}
          </button>
        </form>
      ))}
    </div>
  );
}

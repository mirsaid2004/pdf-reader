// Server-only entry. Client/edge code should import from "@/shared/auth/routes".
export { auth, handlers, signIn, signOut } from "./auth";
export { getCurrentUser, requireUser, type SessionUser } from "./session";
export * from "./routes";

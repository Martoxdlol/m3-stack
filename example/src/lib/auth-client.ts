import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: new URL("/", window.location.href).href,
});

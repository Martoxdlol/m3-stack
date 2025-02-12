import { customAlphabet } from "nanoid";

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const init: Record<string, string> = { cache: "no-cache", mode: "no-cors" };

export const fetcher = <T>(url: string): Promise<T> =>
  fetch(url, init).then((res) => res.json() as T);

export function useFirstBoolean(...values: [...unknown[], boolean]) {
  return values.find((v) => v === false || v === true) || false;
}

export function cancellableWait(ms: number, signal: AbortSignal) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new Error("Aborted"));
    });
  });
}

export function getNameTwoInitialsSafe(name: string) {
  const parts = name.split(" ");
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export const nanoidCustom = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  22
);

export function createId(size?: number) {
  return nanoidCustom(size);
}

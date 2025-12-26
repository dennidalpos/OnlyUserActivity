import crypto from "crypto"

export type UserIdentityInput = { upn?: string; sid?: string }

export function computeUserKey(input: UserIdentityInput): string {
  const upn = input.upn?.trim()
  const sid = input.sid?.trim()
  if (!upn && !sid) {
    throw new Error("missing identity")
  }
  const normalized = upn
    ? `upn:${upn.toLowerCase()}`
    : `sid:${sid as string}`
  const hash = crypto.createHash("sha256").update(normalized).digest("hex")
  return hash.toLowerCase()
}

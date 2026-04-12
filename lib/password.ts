import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.COMMENT_PASSWORD_SECRET ?? "daldidan-comment-secret";

export function hashPassword(password: string): string {
  return createHmac("sha256", SECRET).update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  const expected = hashPassword(password);
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

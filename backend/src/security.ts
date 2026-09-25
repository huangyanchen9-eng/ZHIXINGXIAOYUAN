import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 3, maxmem: 128 * 1024 * 1024 },
      (err, key) => (err ? reject(err) : resolve(key)),
    ),
  );
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + (await derive(password, salt)).toString("hex");
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  const actual = await derive(password, salt);
  const expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const token = () => randomBytes(32).toString("hex");
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");

import argon2 from "argon2";

// Pre-computed valid argon2id hash used for constant-time dummy verification when user is not found
const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgqlfreSAeYQ";

export function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function dummyVerifyPassword(password: string): Promise<boolean> {
  try {
    await argon2.verify(DUMMY_HASH, password);
  } catch {
    // Expected to fail match, timing remains consistent
  }
  return false;
}

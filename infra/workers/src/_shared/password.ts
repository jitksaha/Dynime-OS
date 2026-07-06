// Bcrypt verify/hash. Supabase stores bcrypt hashes in auth.users.encrypted_password,
// so migrated users keep their passwords and verify here unchanged.
// bcryptjs is pure-JS and Workers-compatible (no native bindings).

import bcrypt from "bcryptjs";

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10); // matches Supabase's default cost
}

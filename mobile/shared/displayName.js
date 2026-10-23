/** @param {{ nickName?: string, fullName?: string } | null | undefined} user */
export function displayName(user, fallback = "") {
  return user?.nickName?.trim() || user?.fullName || fallback;
}

export const NICKNAME_LIMIT = 50;
export const BIO_LIMIT = 500;

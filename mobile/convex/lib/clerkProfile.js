// Server-only extraction from Clerk's authenticated Backend API response.
export function primaryVerifiedEmail(user) {
  const email = user?.email_addresses?.find(address => address.id === user.primary_email_address_id && address.verification?.status === "verified")?.email_address;
  return typeof email === "string" && email.length <= 320 && /^[^\s@]+@[^\s@]+$/u.test(email) ? email : null;
}

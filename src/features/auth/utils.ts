export async function hashPIN(pin: string): Promise<string | null> {
  if (!pin) return null;
  if (!/^\d{6}$/.test(pin)) return null;
  const msgBuffer = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

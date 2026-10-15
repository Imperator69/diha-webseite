/** IBAN-Prüfziffer nach ISO 13616 (Modulo 97). Erwartet Großbuchstaben ohne Leerzeichen. */
export function isValidIban(value: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(value)) return false;
  const moved = value.slice(4) + value.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const digits = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}

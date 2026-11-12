export const UNIT = 10n ** 18n;
export function parseAmount(value: string): string {
  if (!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(value))
    throw new Error("Use a positive decimal with at most 18 decimal places.");
  const [whole, part = ""] = value.split(".");
  const n = BigInt(whole) * UNIT + BigInt(part.padEnd(18, "0"));
  if (n <= 0n || n > 2n ** 128n - 1n)
    throw new Error("Amount is outside the supported range.");
  return n.toString();
}
export function format(value: string = "0"): string {
  const n = BigInt(value);
  return `${(n / UNIT).toLocaleString("en-US")}.${(n % UNIT).toString().padStart(18, "0").slice(0, 4)}`;
}
export function quote(input: string, output: string, amount: string): string {
  const x = BigInt(input),
    y = BigInt(output),
    a = BigInt(amount);
  if (x <= 0n || y <= 0n || a <= 0n) throw new Error("Pool unavailable.");
  return ((a * 9970n * y) / (x * 10000n + a * 9970n)).toString();
}

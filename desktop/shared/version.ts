// Сравнение версий для обновлений.

/** «0.3.12» новее «0.3.9»? */
export function isNewer(candidate: string, current: string): boolean {
  const a = candidate.split(/[.-]/).map((x) => Number.parseInt(x, 10) || 0);
  const b = current.split(/[.-]/).map((x) => Number.parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

/** Версия из latest.yml («version: 0.3.12»). */
export function versionFromYml(text: string): string | undefined {
  return text.match(/^version:\s*['"]?([\w.-]+)/m)?.[1];
}

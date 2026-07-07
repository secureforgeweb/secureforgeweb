/** Corrige URLs Git coladas em duplicata no formulário. */
export function sanitizeGitRepositoryUrlInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const segments = trimmed
    .split(/(?=https?:\/\/)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length > 1) {
    const withGit = segments.find((s) => /\.git(\/)?$/i.test(s));
    return (withGit ?? segments[segments.length - 1]).trim();
  }

  return trimmed;
}

export function hasDuplicateGitUrlProtocols(raw: string): boolean {
  return (raw.match(/https?:\/\//gi) ?? []).length > 1;
}

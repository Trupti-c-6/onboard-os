export function resolveCompanyEmail(storedEmail: string | null | undefined, userEmail: string | null | undefined): string {
  return storedEmail?.trim() || userEmail?.trim() || "";
}
export function canonicalCategories(rows: Array<{ category: string | null }>): string[] {
  return [...new Set(
    rows
      .map((row) => row.category?.trim())
      .filter((category): category is string => Boolean(category))
  )].sort((left, right) => left.localeCompare(right));
}
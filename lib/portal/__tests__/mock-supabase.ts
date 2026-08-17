// A deliberately minimal fake of the subset of the Supabase query builder
// this codebase actually uses (.select/.eq/.order/.limit/.in/.single/
// .maybeSingle, plus being awaitable directly). It does NOT simulate actual
// filtering — whatever rows you hand it for a table are what every query
// against that table returns, regardless of .eq()/.in() arguments.
//
// That's a deliberate scope limit: these tests exercise the aggregation/
// decision logic in our own code (e.g. "is every required step present in
// the submitted set?"), not Postgres's query semantics or RLS, which can
// only be verified against a real database. See RELEASE_REPORT.md for what
// that gap means in practice.
export function createMockSupabase(tables: Record<string, unknown[]>) {
  function makeChain(rows: unknown[]) {
    const result = { data: rows, error: null };
    const singleResult = { data: rows[0] ?? null, error: null };
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      in: () => chain,
      update: () => chain,
      insert: () => chain,
      single: () => Promise.resolve(singleResult),
      maybeSingle: () => Promise.resolve(singleResult),
      then: (resolve: (v: typeof result) => void) => resolve(result),
    };
    return chain;
  }

  return {
    from: (table: string) => makeChain(tables[table] ?? []),
  };
}

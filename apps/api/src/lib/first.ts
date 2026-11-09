/** Returns the first row of a query result (for aggregate queries that always yield exactly one row). */
export const first = <T,>(rows: T[]): T => rows[0]!;

/**
 * One-line JSON logs. Hosting platforms (Vercel, Fly, Render) index JSON
 * fields, so events can be searched by name, request id, or tx hash without
 * a logging dependency.
 */
type Level = "info" | "warn" | "error";

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return err;
}

export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const entry: Record<string, unknown> = { level, event, time: new Date().toISOString() };
  for (const [key, value] of Object.entries(fields)) {
    entry[key] = key === "error" ? serializeError(value) : value;
  }
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

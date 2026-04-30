type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;
const redactedValue = "[REDACTED]";
const sensitiveKeys = [
  "access_token",
  "api_key",
  "apikey",
  "authorization",
  "cookie",
  "private_key",
  "refresh_token",
  "secret",
  "token"
];

export function requestIdFrom(request: Request): string {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}

export function logInfo(message: string, context: LogContext = {}): void {
  writeLog("info", message, context);
}

export function logWarn(message: string, context: LogContext = {}): void {
  writeLog("warn", message, context);
}

export function logError(message: string, context: LogContext = {}): void {
  writeLog("error", message, context);
}

function writeLog(level: LogLevel, message: string, context: LogContext): void {
  const safeContext = redactContext(context);
  const record = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: "changethis-web",
    ...(isRecord(safeContext) ? safeContext : {})
  };

  const line = JSON.stringify(record);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

function redactContext(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactContext(item));
  }

  if (!isRecord(value)) {
    return typeof value === "string" && value.length > 2000
      ? `${value.slice(0, 2000)}…`
      : value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => {
      if (isSensitiveKey(key)) {
        return [key, redactedValue];
      }

      return [key, redactContext(nestedValue)];
    })
  );
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return sensitiveKeys.some((fragment) => normalized.includes(fragment));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

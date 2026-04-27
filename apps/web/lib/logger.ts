type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

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
  const record = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: "changethis-web",
    ...context
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

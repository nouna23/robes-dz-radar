const DB_RETRY_DELAY_MS = 3_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withDbRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch {
    await sleep(DB_RETRY_DELAY_MS);
    return operation();
  }
}

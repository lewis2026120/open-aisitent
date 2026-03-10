export function loadDotEnv(): void {
  try {
    process.loadEnvFile?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: failed to load .env file: ${message}`);
  }
}

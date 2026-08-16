type Environment = Record<string, unknown>;

function requiredString(config: Environment, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function validateEnvironment(config: Environment): Environment {
  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return {
    ...config,
    PORT: port,
    DATABASE_URL: requiredString(config, 'DATABASE_URL'),
    STORAGE_ROOT: requiredString(config, 'STORAGE_ROOT'),
    AUTH_SECRET: requiredString(config, 'AUTH_SECRET'),
    WECHAT_APPID: String(config.WECHAT_APPID ?? ''),
    WECHAT_SECRET: String(config.WECHAT_SECRET ?? ''),
    BILLING_ENABLED: String(config.BILLING_ENABLED ?? 'false') === 'true',
    MODEL_PROVIDER: String(config.MODEL_PROVIDER ?? 'mock'),
    MODERATION_PROVIDER: String(config.MODERATION_PROVIDER ?? 'mock'),
    DEV_LOGIN_ENABLED: String(config.DEV_LOGIN_ENABLED ?? 'false') === 'true',
  };
}

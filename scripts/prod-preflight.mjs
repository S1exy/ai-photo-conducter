const failures = [];
const requireValue = (key) => {
  if (!process.env[key]) failures.push(`${key} 未配置`);
};

if (process.env.NODE_ENV !== 'production') failures.push('NODE_ENV 必须为 production');
if (process.env.DEV_LOGIN_ENABLED !== 'false') failures.push('DEV_LOGIN_ENABLED 必须关闭');
if (!process.env.PUBLIC_API_ORIGIN?.startsWith('https://')) failures.push('PUBLIC_API_ORIGIN 必须使用 HTTPS');
if (process.env.MODEL_PROVIDER === 'mock') failures.push('MODEL_PROVIDER 不能使用 mock');
if (process.env.MODERATION_PROVIDER === 'mock') failures.push('MODERATION_PROVIDER 不能使用 mock');
requireValue('WECHAT_APPID');
requireValue('WECHAT_SECRET');
requireValue('AUTH_SECRET');
requireValue('DATABASE_URL');
requireValue('STORAGE_ROOT');

if (failures.length) {
  console.error('生产上线前检查未通过：');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('生产上线前配置检查通过。');

/**
 * 从环境变量读取配置，全部带默认值，.env 里没写的项也能跑。
 */

function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function toBool(value, fallback) {
  if (value == null || value === '') return fallback;
  return value === '1' || value === 'true' || value === 'yes';
}

/** 判断 API Key 是否像是有效的：sk- 开头、纯英文数字下划线（有中文/空格/占位符都是 false） */
export function apiKeyIsValid(key) {
  return typeof key === 'string' && /^sk-[A-Za-z0-9_-]{8,}$/.test(key);
}

export function loadConfig(env = process.env) {
  const baseUrl = (env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');

  return {
    // DeepSeek
    apiKey: (env.DEEPSEEK_API_KEY || '').trim(),
    baseUrl,
    model: env.DEEPSEEK_MODEL || 'deepseek-chat',
    systemPrompt: env.BOT_SYSTEM_PROMPT || '你是一个友好的 QQ 助手。',

    // 连接
    wsHost: env.BOT_WS_HOST || '127.0.0.1',
    wsPort: toInt(env.BOT_WS_PORT, 3001),
    wsPath: env.BOT_WS_PATH || '/onebot/v11/ws',

    // 行为
    dryRun: toBool(env.BOT_DRY_RUN, false),
    maxHistory: toInt(env.BOT_MAX_HISTORY, 12),
    replyMaxChars: toInt(env.BOT_REPLY_MAX_CHARS, 1800),
    triggerMode: env.BOT_TRIGGER_MODE || 'at_or_prefix',
    prefix: env.BOT_PREFIX || '/',
    enablePrivate: toBool(env.BOT_ENABLE_PRIVATE, true),
    enableGroups: toBool(env.BOT_ENABLE_GROUPS, true),
  };
}

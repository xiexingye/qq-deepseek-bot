/**
 * 调用 DeepSeek 的对话接口。
 * DeepSeek 是 OpenAI 兼容接口，直接用内置 fetch 就行，不需要装 SDK。
 */

/** 单次调用，返回 { content, reasoning_content } */
async function callOnce(cfg, messages, maxTokens) {
  const url = `${cfg.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // 401 = key 错误，429 = 限流/欠费，400 = 请求格式/模型名错误
    throw new Error(`DeepSeek 返回 ${res.status}：${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const msg = data?.choices?.[0]?.message ?? {};
  return { content: msg.content ?? '', reasoning_content: msg.reasoning_content ?? '' };
}

export async function chat(cfg, messages) {
  // 测试模式：不联网、不花钱，直接回显最后一句用户输入
  if (cfg.dryRun) {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    return `[DRY-RUN] 收到：${last?.content ?? ''}`;
  }

  // Key 含中文/占位符会直接炸在 HTTP 头里，先给一句能看懂的话
  if (!/^sk-[A-Za-z0-9_-]{8,}$/.test(cfg.apiKey)) {
    throw new Error(
      'API Key 无效：请用记事本打开 .env，把 DEEPSEEK_API_KEY 换成真实 Key（sk- 开头、纯英文数字），不要留「sk-你的key」占位符。'
    );
  }

  // deepseek-v4-flash 是推理模型：先思考（reasoning_content）再写正文（content）。
  // 如果 max_tokens 太小，思考会把额度烧完、正文为空，于是先用 2048 试一次，
  // 发现正文为空但有过思考时，用更大的上限重试一次。
  let result = await callOnce(cfg, messages, 2048);
  if (!result.content && result.reasoning_content) {
    result = await callOnce(cfg, messages, 8192);
  }

  const text = result.content.trim();
  if (!text) {
    throw new Error('DeepSeek 没有返回正文（可能问题太复杂），请重试或换个问法。');
  }
  return text;
}

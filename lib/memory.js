/**
 * 对话记忆：每个会话（私聊按人、群聊按群）各自维护一段历史，
 * 超过 maxHistory 条就丢掉最旧的，避免上下文无限增长。
 */
export class Memory {
  constructor(systemPrompt, maxHistory) {
    this.systemPrompt = systemPrompt;
    this.maxHistory = maxHistory;
    /** @type {Map<string, Array<{role:string, content:string}>>} */
    this.sessions = new Map();
  }

  /** 私聊用 p:用户号，群聊用 g:群号，互不串台 */
  keyFor(message) {
    return message.message_type === 'group' ? `g:${message.group_id}` : `p:${message.user_id}`;
  }

  push(key, role, content) {
    const list = this.sessions.get(key) ?? [];
    list.push({ role, content });
    while (list.length > this.maxHistory) list.shift();
    this.sessions.set(key, list);
  }

  /** 组装成发给 DeepSeek 的 messages：system + 历史 */
  messagesFor(key) {
    return [{ role: 'system', content: this.systemPrompt }, ...(this.sessions.get(key) ?? [])];
  }

  reset(key) {
    this.sessions.delete(key);
  }

  size(key) {
    return this.sessions.get(key)?.length ?? 0;
  }
}

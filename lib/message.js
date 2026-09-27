/**
 * OneBot 11 消息的解析与触发判断。
 */

/** 取纯文本：优先 raw_message，否则把 message 数组里的 text 段拼起来 */
export function extractText(event) {
  if (typeof event.raw_message === 'string') return event.raw_message.trim();
  if (Array.isArray(event.message)) {
    return event.message
      .map((seg) => (seg.type === 'text' ? seg.data?.text ?? '' : ''))
      .join('')
      .trim();
  }
  return '';
}

/** 是否 @ 了机器人自己 */
export function isAtSelf(event) {
  const self = String(event.self_id ?? '');
  if (typeof event.raw_message === 'string') {
    if (event.raw_message.includes(`[CQ:at,qq=${self}]`)) return true;
  }
  if (Array.isArray(event.message)) {
    return event.message.some((seg) => seg.type === 'at' && String(seg.data?.qq) === self);
  }
  return false;
}

/** 这条消息该不该回应（私聊总是回，群聊按触发方式判断） */
export function shouldRespond(event, cfg) {
  if (event.message_type === 'private') return cfg.enablePrivate;
  if (event.message_type !== 'group') return false;
  if (!cfg.enableGroups) return false;

  if (cfg.triggerMode === 'all') return true;
  if (cfg.triggerMode === 'prefix') return extractText(event).startsWith(cfg.prefix);
  // 默认 at_or_prefix：@我 或 以 / 开头
  if (isAtSelf(event)) return true;
  return extractText(event).startsWith(cfg.prefix);
}

/** 去掉 CQ 码和触发前缀，得到真正要喂给大模型的文字 */
export function cleanText(text, cfg) {
  let t = text.replace(/\[CQ:[^\]]+\]/g, ' ').trim();
  if (cfg.prefix && t.startsWith(cfg.prefix)) t = t.slice(cfg.prefix.length).trim();
  return t;
}

/** 超长按字符数分段，避免一条消息发不出去 */
export function splitForQQ(text, max) {
  if (text.length <= max) return [text];
  const parts = [];
  let rest = text;
  while (rest.length > max) {
    parts.push(rest.slice(0, max));
    rest = rest.slice(max);
  }
  if (rest) parts.push(rest);
  return parts;
}

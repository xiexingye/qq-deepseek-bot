import { Memory } from './memory.js';
import { chat } from './deepseek.js';
import { extractText, shouldRespond, cleanText, splitForQQ } from './message.js';

/**
 * 组装出一个"机器人"，把记忆、回复、命令处理都封装在这里。
 * 拆出来是为了方便做单元测试（不依赖真实的 WebSocket 连接）。
 */
export function createBot(cfg) {
  const memory = new Memory(cfg.systemPrompt, cfg.maxHistory);

  function log(...args) {
    console.log(new Date().toISOString().slice(11, 19), ...args);
  }

  /** 通过 socket 发送 OneBot action */
  function send(socket, action, params, echo) {
    if (socket.readyState !== 1) return; // 1 = OPEN
    socket.send(JSON.stringify({ action, params, echo }));
  }

  /** 回复一条消息（超长自动分段） */
  function reply(socket, event, text) {
    const params = { message_type: event.message_type };
    if (event.message_type === 'group') params.group_id = event.group_id;
    else params.user_id = event.user_id;

    const parts = splitForQQ(text, cfg.replyMaxChars);
    parts.forEach((part, i) => {
      send(socket, 'send_msg', { ...params, message: part }, `reply-${event.message_id}-${i}`);
    });
  }

  /** 核心：处理一条 message 事件 */
  async function handleMessage(socket, event) {
    if (event.post_type !== 'message') return;
    if (!shouldRespond(event, cfg)) return;

    const key = memory.keyFor(event);
    const raw = extractText(event);
    // 去掉 @ 之类的 CQ 码，但保留 / 前缀，用于下面命令判断
    const withoutCq = raw.replace(/\[CQ:[^\]]+\]/g, ' ').trim();

    // 内置命令（不喂给大模型）
    if (withoutCq === '/reset' || withoutCq === '重置' || withoutCq === '清空记忆') {
      memory.reset(key);
      reply(socket, event, '已清空对话记忆。');
      return;
    }
    if (withoutCq === '/help' || withoutCq === '帮助') {
      reply(socket, event, '直接跟我说话即可；发送 /reset 清空记忆。');
      return;
    }

    const text = cleanText(withoutCq, cfg); // 去掉前缀，剩下的喂给大模型
    if (!text) return;

    memory.push(key, 'user', text);
    try {
      log(`[请求] ${event.message_type} ${key}：${text.slice(0, 40)}`);
      const answer = await chat(cfg, memory.messagesFor(key));
      memory.push(key, 'assistant', answer);
      reply(socket, event, answer);
    } catch (err) {
      log(`[错误] ${err.message}`);
      reply(socket, event, `出错了：${err.message}`);
    }
  }

  return { memory, handleMessage, reply };
}

/**
 * 无网络的单元测试：不启动 WebSocket、不调 DeepSeek，
 * 直接喂事件给机器人逻辑，验证"该不该回、回给谁、记忆/命令是否正常"。
 * 运行：npm test
 */
import { loadConfig } from '../lib/config.js';
import { createBot } from '../lib/bot.js';

const cfg = loadConfig({ ...process.env, BOT_DRY_RUN: '1', DEEPSEEK_API_KEY: '' });
const bot = createBot(cfg);

function fakeSocket() {
  const sent = [];
  return {
    readyState: 1,
    send(payload) {
      sent.push(JSON.parse(payload));
    },
    sent,
  };
}

let failures = 0;
function assert(cond, name) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name);
  if (!cond) failures++;
}

console.log('== 1. 私聊消息应触发回复 ==');
const s1 = fakeSocket();
await bot.handleMessage(s1, {
  post_type: 'message', message_type: 'private', user_id: 20002, message_id: 1,
  raw_message: '你好，介绍一下你自己',
});
assert(s1.sent.length === 1 && s1.sent[0].action === 'send_msg', '触发一次 send_msg');
assert(s1.sent[0].params.user_id === 20002, '回复给正确的 user_id');
assert(/DRY-RUN/.test(s1.sent[0].params.message), 'dry-run 回显内容正确');

console.log('== 2. 群聊里既没 @ 也没前缀 → 不回复 ==');
const s2 = fakeSocket();
await bot.handleMessage(s2, {
  post_type: 'message', message_type: 'group', group_id: 30003, user_id: 20002,
  self_id: 10001, message_id: 2, raw_message: '随便聊聊',
});
assert(s2.sent.length === 0, '群聊普通消息不回复（at_or_prefix 模式）');

console.log('== 3. 群聊 @ 机器人 → 回复给群 ==');
const s3 = fakeSocket();
await bot.handleMessage(s3, {
  post_type: 'message', message_type: 'group', group_id: 30003, user_id: 20002,
  self_id: 10001, message_id: 3,
  raw_message: '[CQ:at,qq=10001] 你好',
  message: [{ type: 'at', data: { qq: '10001' } }, { type: 'text', data: { text: ' 你好' } }],
});
assert(s3.sent.length === 1 && s3.sent[0].params.group_id === 30003, '@ 机器人时回复给群');

console.log('== 4. 内置命令 ==');
const s4 = fakeSocket();
await bot.handleMessage(s4, {
  post_type: 'message', message_type: 'private', user_id: 20002, message_id: 4, raw_message: '/help',
});
assert(s4.sent.length === 1 && s4.sent[0].params.message.includes('/reset'), '/help 返回帮助');

const s5 = fakeSocket();
await bot.handleMessage(s5, {
  post_type: 'message', message_type: 'private', user_id: 20002, message_id: 5, raw_message: '/reset',
});
assert(bot.memory.size('p:20002') === 0, '/reset 后该会话记忆被清空');

console.log('== 5. 记忆长度上限 ==');
const mem = bot.memory;
for (let i = 0; i < 20; i++) mem.push('p:99999', 'user', `消息${i}`);
assert(mem.size('p:99999') === cfg.maxHistory, `记忆被裁剪到 ${cfg.maxHistory} 条`);

console.log('');
if (failures) {
  console.log(`测试失败 ${failures} 项`);
  process.exit(1);
}
console.log('全部通过 ✓');

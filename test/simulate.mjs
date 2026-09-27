/**
 * 真实联调用的模拟客户端：假装自己是 NapCat，
 * 连上机器人的反向 WebSocket，发一条私聊消息，打印收到的回复。
 *
 * 用法（先启动机器人，再另开一个终端）：
 *   npm start          # 或 npm run simulate 前先确保机器人在跑
 *   npm run simulate
 */
import WebSocket from 'ws';

const url = process.env.BOT_WS_URL || 'ws://127.0.0.1:3001/onebot/v11/ws';

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('[simulate] 已连上机器人，发送一条私聊消息……');
  const event = {
    time: Math.floor(Date.now() / 1000),
    self_id: 10001,
    post_type: 'message',
    message_type: 'private',
    sub_type: 'friend',
    message_id: 123456,
    user_id: 20002,
    message: [{ type: 'text', data: { text: '你好，用一句话介绍你自己' } }],
    raw_message: '你好，用一句话介绍你自己',
    font: 0,
    sender: { user_id: 20002, nickname: '测试用户', sex: 'unknown', age: 0 },
  };
  ws.send(JSON.stringify(event));
});

ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.action === 'send_msg') {
    console.log('[simulate] 收到机器人回复：');
    console.log(JSON.stringify(m.params, null, 2));
    console.log('[simulate] 联调成功 ✓');
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (err) => {
  console.error('[simulate] 连接失败：', err.message);
  console.error('  提示：先启动机器人（npm start），确认它监听在', url);
  process.exit(1);
});

setTimeout(() => {
  console.error('[simulate] 超时：10 秒内没收到回复');
  process.exit(1);
}, 10000);

import { WebSocketServer, WebSocket } from 'ws';
import { loadConfig } from './lib/config.js';
import { createBot } from './lib/bot.js';

const cfg = loadConfig();

// 正式模式必须有有效的 key，测试模式（dry-run）可以没有
if (!cfg.dryRun) {
  if (!cfg.apiKey) {
    console.error('[启动失败] 缺少 DEEPSEEK_API_KEY。');
    console.error('  1. 用记事本打开 .env');
    console.error('  2. 把 DEEPSEEK_API_KEY 填成 platform.deepseek.com 申请的 Key');
    console.error('  3. 重新运行');
    process.exit(1);
  }
  if (!/^sk-[A-Za-z0-9_-]{8,}$/.test(cfg.apiKey)) {
    console.error('[启动失败] DEEPSEEK_API_KEY 格式不对。');
    console.error('  你的 .env 里现在还是占位符「sk-你的key」之类，请换成真实 Key（sk- 开头、纯英文数字）。');
    process.exit(1);
  }
}

const bot = createBot(cfg);
const sockets = new Set();

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

// 反向 WebSocket 服务：NapCat 会主动连到这里
const wss = new WebSocketServer({ host: cfg.wsHost, port: cfg.wsPort, path: cfg.wsPath });

wss.on('connection', (socket) => {
  sockets.add(socket);
  log(`[连接] NapCat 已连入（当前 ${sockets.size} 个连接）`);

  socket.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return; // 不是 JSON，忽略
    }

    if (data.post_type === 'message') {
      // 消息事件 → 交给机器人处理（异步，不阻塞 socket）
      bot.handleMessage(socket, data);
    } else if (data.echo && data.retcode !== undefined) {
      // 这是我们对 send_msg 的响应；retcode 非 0 说明发送失败
      if (data.retcode !== 0) {
        log(`[发送失败] echo=${data.echo} retcode=${data.retcode}`);
      }
    }
  });

  socket.on('close', () => {
    sockets.delete(socket);
    log('[连接] NapCat 断开');
  });

  socket.on('error', (err) => log('[socket 错误]', err.message));
});

wss.on('error', (err) => {
  log('[服务错误]', err.message);
});

const url = `ws://${cfg.wsHost}:${cfg.wsPort}${cfg.wsPath}`;
log(`机器人已启动：${url}`);
log(`模式：${cfg.dryRun ? 'DRY-RUN 测试（不调用 DeepSeek）' : '正式'}　模型：${cfg.model}`);
log(`触发：${cfg.triggerMode}　记忆条数：${cfg.maxHistory}`);
log('等待 NapCat 连入……');

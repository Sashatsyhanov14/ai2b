const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = "sed -i 's/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=7978306510:AAHv6cduZnbcDk3W8UQbmbUm7CwCkZAV1m8/' /root/bots/bot4/.env && sed -i 's/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=7978306510:AAHv6cduZnbcDk3W8UQbmbUm7CwCkZAV1m8/' /root/bot4_env.backup && pm2 restart bot4";
  conn.exec(cmd, (err, stream) => {
    stream.on('close', () => conn.end());
    stream.on('data', data => console.log(data.toString()));
    stream.stderr.on('data', data => console.error(data.toString()));
  });
}).connect({
  host: '178.210.161.187',
  port: 22667,
  username: 'root',
  password: '9qJ1SFL5tT4olz0'
});

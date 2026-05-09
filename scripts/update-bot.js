const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection established. Updating bot...');

  const updateCmd = `
    cd /root/bots/bot4 &&
    git pull &&
    npm install &&
    npm run build &&
    pm2 restart bot4
  `;

  conn.exec(updateCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Update and build complete. PM2 restarted.');
      conn.end();
    }).on('data', data => console.log('STDOUT:', data.toString()))
      .stderr.on('data', data => console.log('STDERR:', data.toString()));
  });
}).connect({
  host: '178.210.161.187',
  port: 22667,
  username: 'root',
  password: '9qJ1SFL5tT4olz0',
  readyTimeout: 99999
});

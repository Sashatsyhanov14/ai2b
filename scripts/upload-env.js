const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut('.env.local', '/root/bots/bot4/.env', (err) => {
      if (err) throw err;
      console.log('.env uploaded to VPS successfully.');
      
      // Now restart PM2
      conn.exec('cd /root/bots/bot4 && pm2 restart bot4', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
          console.log('PM2 restarted successfully.');
          conn.end();
        }).on('data', data => console.log(data.toString()))
          .stderr.on('data', data => console.error(data.toString()));
      });
    });
  });
}).connect({
  host: '178.210.161.187',
  port: 22667,
  username: 'root',
  password: '9qJ1SFL5tT4olz0'
});

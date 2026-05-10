const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('SSH connection established. Updating server...');

  const updateCmd = `
    cd /root/bots/bot4 &&
    git pull origin main &&
    npm install &&
    npm run build &&
    pm2 delete bot4 || true &&
    pm2 start ecosystem.config.js
  `;

  conn.exec(updateCmd, (err, stream) => {
    if (err) {
      console.error('Execution error:', err);
      conn.end();
      return;
    }
    
    stream.on('close', (code) => {
      console.log(`Update process finished with code ${code}`);
      conn.end();
    })
    .on('data', (data) => {
      process.stdout.write(data.toString());
    })
    .stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).connect({
  host: '178.210.161.187',
  port: 22667,
  username: 'root',
  password: '9qJ1SFL5tT4olz0',
  readyTimeout: 99999
});

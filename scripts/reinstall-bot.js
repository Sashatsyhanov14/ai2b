const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection established. Beginning fresh installation...');

  // Step 1: Delete PM2 process, delete folder, and clone repo
  const setupCmd = `
    pm2 delete bot4 || true;
    rm -rf /root/bots/bot4;
    git clone https://github.com/Sashatsyhanov14/ai2b.git /root/bots/bot4;
  `;

  conn.exec(setupCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Cleanup and clone completed.');
      
      // Step 2: Upload .env file
      conn.sftp((err, sftp) => {
        if (err) throw err;
        sftp.fastPut('.env.local', '/root/bots/bot4/.env', (err) => {
          if (err) throw err;
          console.log('.env uploaded to VPS successfully.');
          
          // Step 3: Install, build, and start
          const buildCmd = `
            cd /root/bots/bot4 &&
            npm install &&
            npm run build &&
            pm2 start ecosystem.config.js &&
            pm2 save
          `;
          conn.exec(buildCmd, (err, buildStream) => {
             if (err) throw err;
             buildStream.on('close', () => {
               console.log('Installation and build complete. PM2 restarted.');
               conn.end();
             }).on('data', data => console.log('BUILD STDOUT:', data.toString()))
               .stderr.on('data', data => console.log('BUILD STDERR:', data.toString()));
          });
        });
      });
    }).on('data', data => console.log('SETUP STDOUT:', data.toString()))
      .stderr.on('data', data => console.log('SETUP STDERR:', data.toString()));
  });
}).connect({
  host: '178.210.161.187',
  port: 22667,
  username: 'root',
  password: '9qJ1SFL5tT4olz0',
  readyTimeout: 99999
});

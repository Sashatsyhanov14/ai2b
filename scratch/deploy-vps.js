const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');

const conn = new Client();

const config = {
  host: '178.210.161.187',
  port: 22667,
  username: 'root',
  password: '9qJ1SFL5tT4olz0',
  readyTimeout: 99999
};

const REMOTE_DIR = '/root/bots/bot4';
const LOCAL_ARCHIVE = path.resolve(__dirname, '../update.tar.gz');

conn.on('ready', () => {
  console.log('SSH Ready. Uploading archive...');
  conn.sftp((err, sftp) => {
    if (err) throw err;

    sftp.fastPut(LOCAL_ARCHIVE, REMOTE_DIR + '/update.tar.gz', (err) => {
      if (err) throw err;
      console.log('Upload complete. Extracting and building...');
      
      const cmd = `
        cd ${REMOTE_DIR} &&
        tar -xzf update.tar.gz &&
        npm install &&
        node scratch/migrate-db.js &&
        npm run build &&
        pm2 delete bot4 || true &&
        pm2 start ecosystem.config.js
      `;

      conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
          console.log(`Deployment finished with code ${code}`);
          conn.end();
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    });
  });
}).connect(config);

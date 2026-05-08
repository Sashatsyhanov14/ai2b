const { Client } = require('ssh2');

const conf = `
server {
    server_name estate.ticaretai.tr;

    location / {
        proxy_pass http://localhost:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 80;
}
`;

const conn = new Client();
conn.on('ready', () => {
  const cmd = `echo '${conf}' > /etc/nginx/sites-available/bot4.conf && ln -sf /etc/nginx/sites-available/bot4.conf /etc/nginx/sites-enabled/bot4.conf && systemctl reload nginx && certbot --nginx -d estate.ticaretai.tr --non-interactive --agree-tos -m admin@ticaretai.tr`;
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

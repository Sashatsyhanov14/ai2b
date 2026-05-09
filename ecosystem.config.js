module.exports = {
  apps: [
    {
      name: 'bot4',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3004',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};

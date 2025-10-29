module.exports = {
  apps: [
    {
      name: 'my-app',
      script: './src/server.js',
      env_file: '.env',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};

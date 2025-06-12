module.exports = {
  apps: [
    {
      name: 'ABZTECH_MD',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
      }
    }
  ]
};

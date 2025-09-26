/*************************************
 * PM2 Ecosystem File
 * Start all services: pm2 start ecosystem.config.cjs --env production
 * View logs: pm2 logs
 * List processes: pm2 ls
 *************************************/

module.exports = {
  apps: [
    {
      name: 'web-static-server',
      script: 'server.js',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'backend-api',
      script: 'backend/api/server.js',
      cwd: __dirname,
      watch: false,
      instances: 1, // increase if CPU bound endpoints appear
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    // Optional: enable if you run Sanity Studio persistently
    // {
    //   name: 'sanity-studio',
    //   script: 'npm',
    //   args: 'run dev',
    //   cwd: __dirname + '/studio',
    //   env: { NODE_ENV: 'development' },
    //   env_production: { NODE_ENV: 'production' }
    // }
  ]
};

const dotenv = require('dotenv');
const path = require('path');

// 根据 PM2 启动时的 --env 参数来决定加载哪个文件
// pm2 start ecosystem.config.js --env production -> 会读取 .env.prod
// pm2 start ecosystem.config.js -> 默认读取 .env.test
const envPath = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.test';

// 加载环境变量到当前进程
dotenv.config({ path: path.resolve(__dirname, envPath) });

module.exports = {
  apps: [
    {
      name: "squid-processor",
      script: "./lib/main.js",
      // 这里不再需要写具体的变量，直接透传加载到的 process.env
      env: {
        ...process.env,
        NODE_ENV: 'test'
      },
      env_production: {
        ...process.env,
        NODE_ENV: 'production'
      }
    },
    {
      name: "squid-graphql",
      script: "./node_modules/.bin/squid-graphql-server",
      env: {
        ...process.env,
        NODE_ENV: 'test'
      },
      env_production: {
        ...process.env,
        NODE_ENV: 'production'
      }
    }
  ]
};

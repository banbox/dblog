# sv

## Development & Deployment

```sh
# compile paraglide 
npx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/paraglide

npm run dev
# build
npm run build
```

## IRYS存储
配置的标签：
```text
application-id: dblog
creator: address
```

## 安全风险
临时密钥存储在localstorage，同域名下其他页面可读取


# IRYS
连接到节点网关，预先充值代币到其管理的智能合约中，节点可更换。

[官方文档](https://docs.irys.xyz/)  

可下载[markdown文档](https://github.com/Irys-xyz/irys-docs-v3/tree/main/app/_content/build/d)放在当前irys文件夹，方便AI阅读参考

## 多代币充值
https://docs.irys.xyz/build/d/sdk/setup

## 元数据标签
用途：按标签检索，创建可更新数据，声明如何渲染Content-Type  
tip：可添加application-id标签

## 可变数据
更新时带标签Root-TX，值是第一次的交易ID，url使用`mutable/`前缀

## 链上文件夹
使用标签Type和Content-Type标识：
https://gateway.irys.xyz/:manifestId/:pathName

可变：https://gateway.irys.xyz/mutable/:manifestId/:fileName

## 资金授权
允许其他地址使用自己余额，可自动过期，可撤销或更新

## 交易ID
标识irys交易，可用于访问数据，可上传前先签名生成；  
也可使用IPFS CID访问数据，上传时带标签IPFS-CID，url使用`ipfs/`前缀

## 余额监控
https://docs.irys.xyz/build/d/guides/monitor-account-balance

## lit加密解密
https://docs.irys.xyz/build/d/guides/encrypting-with-lit

## graphql查询
按交易ID、owner、token、tags、timestamp、order等查询，支持指定返回字段


# DBlog去中心化博客
基于Optimism(solidity) + Arweave + Subsquid + SvelteKit

## 关键点说明
* 文章即NFT：每个文章对应一个NFT，用户可收藏文章
* 内容存储：文章具体内容和元数据存储在Arweave上。
* 数据索引：使用SubSquid去中心化索引，查询文章列表等

## 智能合约设计
单体ERC-1155合约+CollectModule插件架构
标准：ERC-1155和ERC-2981（二手交易版税）
特性：可升级、

### 赞赏代付(授权他人代付)
不可使用EIP-2771，因其需要Relayer有中心化倾向，或需中心化 Relayer 网络；应直接使用ERC-4337账户抽象，增加Paymaster代付人合约即可支持代付。
* 用户账户： 每个用户是一个智能合约钱包（Smart Account），而非 EOA。
* Paymaster： 部署一个通用的 Paymaster 合约。
* 资金池： 用户将资金存入 Paymaster 的映射表 balanceOf[user]。
* 授权逻辑： Paymaster 中增加 allowance[user][spender]。
* 执行： 当 Spend（被授权人）发博客时，生成的 UserOp 指定该 Paymaster。Paymaster 验证 Spend 是否有 User 的授权额度，如果有，则 Paymaster 替其支付 Gas，并扣除 User 的账面余额。

## SubSquid索引设计
只索引“关系”和“状态”，不索引文章全文。文章的标题、摘要等 Metadata 由前端获取 Arweave Hash 后在客户端（或 SSR 层）懒加载，或者由 Indexer 的 Worker 异步获取。 为了简化 MVP，我们采用前端懒加载策略，Indexer 只存 Hash。
用 Subsquid 的 Archive（block history ingestion）做可靠回溯，用 Processor 做高吞吐低延迟的事件->实体映射，且把对 Arweave 的 fetch 作为异步任务（避免阻塞事件处理）。

## 数据存储
使用Arweave永久存储文章内容

## 前端集成
Web3交互：viem + @wagmi/core + svelte-wagmi
钱包连接UI：@reown/appkit的纯js模式
数据查询：@urql/svelte

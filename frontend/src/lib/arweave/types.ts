/**
 * Arweave/Irys 相关类型定义
 */

/** 文章元数据 */
export interface ArticleMetadata {
	title: string;
	summary: string;
	content: string; // Markdown 格式
	coverImage?: string; // 封面图 Arweave Hash
	tags: string[];
	createdAt: number; // Unix 时间戳
	version: string; // 数据格式版本
}

/** 文章包 */
export interface ArticleBundle {
	metadata: ArticleMetadata;
	contentType: 'application/json';
}

/** Irys 上传标签 */
export interface IrysTag {
	name: string;
	value: string;
}

/** 上传收据 */
export interface UploadReceipt {
	id: string;
	timestamp: number;
	signature: string;
}

/** 缓存条目 */
export interface CachedArticle {
	data: ArticleMetadata;
	timestamp: number;
}

/** Irys 网络类型 */
export type IrysNetwork = 'mainnet' | 'devnet';

/** Irys 配置 */
export interface IrysConfig {
	network: IrysNetwork;
	rpcUrl?: string;
}

/** 文章文件夹 Manifest 解析结果 */
export interface ArticleFolderManifest {
	manifestId: string;
	indexTxId?: string;      // index.md 的交易 ID
	coverImageTxId?: string; // coverImage 的交易 ID
	allFiles: Record<string, string>; // 所有文件映射 (文件名 -> 交易ID)
}

/** 文章文件夹上传参数 */
export interface ArticleFolderUploadParams {
	title: string;
	summary: string;
	content: string;         // Markdown 内容
	coverImage?: File;       // 封面图片文件
	tags: string[];
}

/** 文章文件夹上传结果 */
export interface ArticleFolderUploadResult {
	manifestId: string;      // 文件夹 manifest ID（用于访问文章）
	indexTxId: string;       // index.md 的交易 ID
	coverImageTxId?: string; // coverImage 的交易 ID（如果有）
}

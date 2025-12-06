/**
 * Session Key 签名的 Irys 上传器
 * 允许使用 Session Key 私钥签名上传，无需 MetaMask 交互
 */

import { WebUploader } from '@irys/web-upload';
import { WebEthereum } from '@irys/web-upload-ethereum';
import { ViemV2Adapter } from '@irys/web-upload-ethereum-viem-v2';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { IrysConfig, IrysNetwork } from './types';
import { getRpcUrl, getIrysNetwork } from '$lib/config';
import { getChainConfig } from '$lib/chain';
import type { StoredSessionKey } from '$lib/sessionKey';

// Irys Uploader 类型
export type SessionKeyIrysUploader = Awaited<ReturnType<typeof createSessionKeyIrysUploader>>;

/**
 * 使用 Session Key 私钥创建 Viem 客户端
 * @param sessionKey - 存储的 Session Key 数据
 */
function createSessionKeyViemClients(sessionKey: StoredSessionKey) {
	const account = privateKeyToAccount(sessionKey.privateKey as `0x${string}`);
	const chain = getChainConfig();
	const rpcUrl = getRpcUrl();

	const walletClient = createWalletClient({
		account,
		chain,
		transport: http(rpcUrl)
	});

	const publicClient = createPublicClient({
		chain,
		transport: http(rpcUrl)
	});

	return { walletClient, publicClient, account };
}

/**
 * 使用 Session Key 创建 Irys Uploader
 * @param sessionKey - 存储的 Session Key 数据
 * @param config - Irys 配置（可选）
 */
export async function createSessionKeyIrysUploader(
	sessionKey: StoredSessionKey,
	config?: Partial<IrysConfig>
) {
	const { walletClient, publicClient } = createSessionKeyViemClients(sessionKey);

	// 使用类型断言解决 viem 版本与 @irys/web-upload-ethereum-viem-v2 的类型不兼容问题
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const viemAdapter = ViemV2Adapter(walletClient as any, { publicClient: publicClient as any });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let builder = WebUploader(WebEthereum).withAdapter(viemAdapter);

	const network = config?.network || getIrysNetwork();
	const rpcUrl = config?.rpcUrl || getRpcUrl();

	if (network === 'devnet') {
		builder = builder.withRpc(rpcUrl).devnet();
	}

	return await builder;
}

/**
 * 获取 Session Key 的 Irys Mainnet Uploader
 * @param sessionKey - 存储的 Session Key 数据
 */
export async function getSessionKeyIrysUploader(
	sessionKey: StoredSessionKey
): Promise<SessionKeyIrysUploader> {
	return createSessionKeyIrysUploader(sessionKey, { network: 'mainnet' });
}

/**
 * 获取 Session Key 的 Irys Devnet Uploader
 * @param sessionKey - 存储的 Session Key 数据
 */
export async function getSessionKeyIrysUploaderDevnet(
	sessionKey: StoredSessionKey
): Promise<SessionKeyIrysUploader> {
	return createSessionKeyIrysUploader(sessionKey, { network: 'devnet' });
}

/**
 * 检查 Session Key 是否有效
 * @param sessionKey - 存储的 Session Key 数据
 */
export function isSessionKeyValid(sessionKey: StoredSessionKey | null): boolean {
	if (!sessionKey) return false;
	// 检查是否过期
	return Date.now() / 1000 < sessionKey.validUntil;
}

import { uploadArticle, uploadImage } from './article'
import { publishToContract } from './contracts'

export async function publishArticle(
  title: string,
  summary: string,
  content: string,
  coverImage: File | null,
  tags: string[],
  categoryId: bigint,
  royaltyBps: bigint,
  originalAuthor: string = ''
) {
  // 1. 上传封面图（如果有）
  let coverImageHash = ''
  if (coverImage) {
    coverImageHash = await uploadImage(coverImage)
  }
  
  // 2. 上传文章内容到 Arweave
  const arweaveId = await uploadArticle({
    title,
    summary,
    content,
    coverImage: coverImageHash,
    tags,
    createdAt: Date.now(),
    version: '1.0.0'
  })
  
  // 3. 调用智能合约发布
  const txHash = await publishToContract(
    arweaveId,
    categoryId,
    royaltyBps,
    originalAuthor
  )
  
  return { arweaveId, txHash }
}
/**
 * 文章分类 keys
 * 索引即为 categoryId，第一个为"其他"
 */
export const CATEGORY_KEYS = [
  'other',           // 0 - 其他
  'technology',      // 1 - 科技
  'finance',         // 2 - 财经
  'entertainment',   // 3 - 娱乐
  'sports',          // 4 - 体育
  'health',          // 5 - 健康
  'education',       // 6 - 教育
  'travel',          // 7 - 旅游
  'food',            // 8 - 美食
  'fashion',         // 9 - 时尚
  'automotive',      // 10 - 汽车
  'real_estate',     // 11 - 房产
  'culture',         // 12 - 文化
  'art',             // 13 - 艺术
  'music',           // 14 - 音乐
  'film',            // 15 - 影视
  'gaming',          // 16 - 游戏
  'science',         // 17 - 科学
  'history',         // 18 - 历史
  'politics',        // 19 - 政治
  'military',        // 20 - 军事
  'law',             // 21 - 法律
  'society',         // 22 - 社会
  'environment',     // 23 - 环境
  'parenting',       // 24 - 育儿
  'pets',            // 25 - 宠物
  'photography',     // 26 - 摄影
  'design',          // 27 - 设计
  'programming',     // 28 - 编程
  'blockchain',      // 29 - 区块链
  'ai',              // 30 - 人工智能
  'startup',         // 31 - 创业
  'career',          // 32 - 职场
  'psychology',      // 33 - 心理
  'philosophy',      // 34 - 哲学
  'literature',      // 35 - 文学
  'comics',          // 36 - 动漫
  'digital_life',    // 37 - 数码
  'home',            // 38 - 家居
  'agriculture',     // 39 - 农业
] as const

export type CategoryKey = (typeof CATEGORY_KEYS)[number]

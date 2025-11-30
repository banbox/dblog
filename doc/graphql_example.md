
```graphql
# 获取最新文章列表
query LatestArticles($limit: Int!, $offset: Int!) {
  articles(
    orderBy: createdAt_DESC
    limit: $limit
    offset: $offset
  ) {
    id
    arweaveId
    author {
      id
    }
    originalAuthor
    likes
    dislikes
    totalTips
    createdAt
  }
}

# 获取用户信息及其文章
query UserProfile($address: String!) {
  userById(id: $address) {
    id
    totalArticles
    totalFollowers
    totalFollowing
    articles(orderBy: createdAt_DESC, limit: 10) {
      id
      arweaveId
      likes
      totalTips
    }
  }
}

# 获取文章详情及评论
query ArticleDetail($articleId: String!) {
  articleById(id: $articleId) {
    id
    arweaveId
    author {
      id
    }
    likes
    dislikes
    totalTips
    evaluations(orderBy: createdAt_DESC) {
      user { id }
      score
      amount
      comment
    }
  }
}

# 获取用户的关注列表
query UserFollowing($address: String!) {
  follows(
    where: { follower: { id_eq: $address }, isActive_eq: true }
  ) {
    following {
      id
      totalArticles
    }
  }
}
```
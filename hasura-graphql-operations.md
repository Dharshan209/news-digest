# Hasura GraphQL Operations for n8n Workflow

This document contains all the GraphQL queries and mutations needed for integrating n8n with your Nhost/Hasura backend.

## User Topics Queries

### Get All User Topics

Use this query to fetch all topics from all users:

```graphql
query GetAllUserTopics {
  topics {
    id
    name
    description
    preference_id
    user_preferences {
      user_id
    }
  }
}
```

### Get Topics for Specific User

Use this query to fetch topics for a specific user:

```graphql
query GetUserTopics($user_id: uuid!) {
  topics(where: {user_preferences: {user_id: {_eq: $user_id}}}) {
    id
    name
    description
  }
}
```

## Article Operations

### Check if Article Exists

Use this query to check if an article already exists in the database:

```graphql
query CheckArticleExists($url: String!) {
  articles(where: {url: {_eq: $url}}) {
    id
  }
}
```

### Insert New Article

Use this mutation to insert a new article:

```graphql
mutation InsertArticle(
  $title: String!,
  $url: String!,
  $source: String!,
  $content: String,
  $author: String,
  $published_at: timestamptz!,
  $category: String,
  $image_url: String
) {
  insert_articles_one(object: {
    title: $title,
    url: $url,
    source: $source,
    content: $content,
    author: $author,
    published_at: $published_at,
    category: $category,
    image_url: $image_url
  }) {
    id
  }
}
```

## Article Summary Operations

### Insert Article Summary

Use this mutation to insert a summary for an article:

```graphql
mutation InsertArticleSummary(
  $article_id: uuid!,
  $summary: String!
) {
  insert_article_summaries_one(object: {
    article_id: $article_id,
    summary: $summary
  }) {
    id
  }
}
```

### Get Article Summary

Use this query to get a summary for an article:

```graphql
query GetArticleSummary($article_id: uuid!) {
  article_summaries(where: {article_id: {_eq: $article_id}}) {
    id
    summary
    created_at
  }
}
```

## Article Sentiment Operations

### Insert Article Sentiment

Use this mutation to insert sentiment analysis for an article:

```graphql
mutation InsertArticleSentiment(
  $article_id: uuid!,
  $sentiment: String!,
  $score: Float!,
  $explanation: String
) {
  insert_article_sentiments_one(object: {
    article_id: $article_id,
    sentiment: $sentiment,
    score: $score,
    explanation: $explanation
  }) {
    id
  }
}
```

### Get Article Sentiment

Use this query to get sentiment analysis for an article:

```graphql
query GetArticleSentiment($article_id: uuid!) {
  article_sentiments(where: {article_id: {_eq: $article_id}}) {
    id
    sentiment
    score
    explanation
    created_at
  }
}
```

## Combined Operations

### Get Articles with Summaries and Sentiments

Use this query to get articles with their summaries and sentiments:

```graphql
query GetArticlesWithDetails($limit: Int = 10) {
  articles(order_by: {published_at: desc}, limit: $limit) {
    id
    title
    url
    source
    published_at
    category
    image_url
    article_summaries {
      summary
    }
    article_sentiments {
      sentiment
      score
      explanation
    }
  }
}
```

### Get Articles for Specific Topics

Use this query to get articles related to specific topics:

```graphql
query GetArticlesByTopics($topic_names: [String!]) {
  articles(
    where: {_or: $topic_names}
    order_by: {published_at: desc},
    limit: 20
  ) {
    id
    title
    url
    source
    published_at
    category
    image_url
    article_summaries {
      summary
    }
    article_sentiments {
      sentiment
      score
    }
  }
}
```

### Get User's Saved Articles

Use this query to get articles saved by a specific user:

```graphql
query GetUserSavedArticles($user_id: uuid!) {
  saved_articles(
    where: {user_id: {_eq: $user_id}},
    order_by: {saved_at: desc}
  ) {
    is_read
    saved_at
    article {
      id
      title
      url
      source
      published_at
      category
      image_url
      article_summaries {
        summary
      }
      article_sentiments {
        sentiment
        score
      }
    }
  }
}
```

## User Preferences Operations

### Get User Preferences

Use this query to get preferences for a specific user:

```graphql
query GetUserPreferences($user_id: uuid!) {
  user_preferences(where: {user_id: {_eq: $user_id}}) {
    id
    keywords
    receive_notifications
    updated_at
    topics {
      id
      name
      description
    }
    sources {
      id
      name
      url
      is_trusted
    }
  }
}
```

### Update User Preferences

Use this mutation to update preferences for a specific user:

```graphql
mutation UpdateUserPreferences(
  $user_id: uuid!,
  $keywords: jsonb,
  $receive_notifications: Boolean
) {
  update_user_preferences(
    where: {user_id: {_eq: $user_id}},
    _set: {
      keywords: $keywords,
      receive_notifications: $receive_notifications
    }
  ) {
    affected_rows
  }
}
```

## Variables Format

When using these operations in n8n, format your variables as follows:

### For Article Insertion:
```json
{
  "title": "Article Title",
  "url": "https://example.com/article",
  "source": "Source Name",
  "content": "Article content...",
  "author": "Author Name",
  "published_at": "2023-01-01T12:00:00Z",
  "category": "Technology",
  "image_url": "https://example.com/image.jpg"
}
```

### For Summary Insertion:
```json
{
  "article_id": "uuid-of-article",
  "summary": "This is a summary of the article..."
}
```

### For Sentiment Insertion:
```json
{
  "article_id": "uuid-of-article",
  "sentiment": "positive",
  "score": 0.85,
  "explanation": "The article presents a positive outlook on the technology..."
}
```
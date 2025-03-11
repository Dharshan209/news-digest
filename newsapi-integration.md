# NewsAPI Integration Guide

This document provides detailed instructions for integrating NewsAPI with n8n to fetch news articles based on user-defined topics.

## NewsAPI Overview

NewsAPI is a simple HTTP REST API for searching and retrieving live articles from all over the web. For this project, we'll use it to:

1. Fetch current news articles based on user-defined topics
2. Filter articles by language, date, and source
3. Get article metadata such as title, description, content, and image URL

## Setup Steps

### 1. NewsAPI Account Setup

1. Create a free account at [NewsAPI](https://newsapi.org)
2. Generate an API key in your account dashboard
3. Note your API key for use in n8n

### 2. API Limitations (Free Plan)

Be aware of the following limitations with the free NewsAPI plan:

- 100 requests per day
- No searching articles older than 1 month
- Limited to headlines from the last day in the `/top-headlines` endpoint
- Developer use only
- No HTTPS requests from non-localhost origins

For higher limits, consider upgrading to a paid plan.

## API Integration in n8n

### Setting Up NewsAPI Credentials

1. In n8n, go to Settings > Credentials
2. Click "Add Credential"
3. Select "API Key Auth" as the type
4. Name: "NewsAPI"
5. API Key Name: "apiKey" (important: use exactly this name)
6. Add your NewsAPI API Key
7. Save

### Creating the NewsAPI HTTP Request Node

In your n8n workflow, add an HTTP Request node with the following configuration:

#### For Everything Endpoint (Search Articles):

- **Method**: GET
- **URL**: `https://newsapi.org/v2/everything`
- **Authentication**: Select your NewsAPI credentials
- **Query Parameters**:
  - `q`: Search term (e.g., `={{$node["Split In Batches"].json["name"]}}`)
  - `language`: en (for English)
  - `sortBy`: publishedAt (options: relevancy, popularity, publishedAt)
  - `pageSize`: 5 (number of results, max 100)
  - `page`: 1 (for pagination)

#### For Top Headlines Endpoint:

- **Method**: GET
- **URL**: `https://newsapi.org/v2/top-headlines`
- **Authentication**: Select your NewsAPI credentials
- **Query Parameters**:
  - `country`: us (for US news, see docs for other options)
  - `category`: Optional (options: business, entertainment, health, science, sports, technology)
  - `pageSize`: 5 (number of results, max 100)
  - `page`: 1 (for pagination)

### Response Format

The NewsAPI response will look like this:

```json
{
  "status": "ok",
  "totalResults": 123,
  "articles": [
    {
      "source": {
        "id": "source-id",
        "name": "Source Name"
      },
      "author": "Author Name",
      "title": "Article Title",
      "description": "Article description...",
      "url": "https://article-url.com",
      "urlToImage": "https://image-url.com/image.jpg",
      "publishedAt": "2023-03-08T13:45:00Z",
      "content": "Article content truncated to 200 characters..."
    },
    // More articles...
  ]
}
```

### Processing Articles in n8n

After receiving the NewsAPI response, use these nodes to process the articles:

1. **Split In Batches Node**:
   - Process each article individually
   - Connect to the HTTP Request node
   - Input: `articles`
   - Batch Size: 1

2. **Check for Duplicates**:
   - Use a GraphQL node to query your Nhost database
   - Check if article URL already exists to avoid duplicates
   - Query:
   ```graphql
   query CheckArticle($url: String!) {
     articles(where: {url: {_eq: $url}}) {
       id
     }
   }
   ```
   - Variables: `{"url": "={{$json.url}}"}`

3. **Filter Node (IF Node)**:
   - Filter out articles without necessary data or duplicates
   - Condition: `{{$json.title !== null && $json.url !== null && $node["Check Duplicates"].json.data.articles.length === 0}}`

## Advanced Features

### Topic-based Fetching

To fetch articles based on user topics from your database:

1. **Fetch User Topics from Nhost**:
   - Use a GraphQL node to get topics from your database
   - Query: 
   ```graphql
   query GetUserTopics {
     topics {
       id
       name
     }
   }
   ```

2. **Loop Over Topics**:
   - Use Split In Batches to process each topic
   - Input field: `data.topics`
   - Batch Size: 1

3. **Fetch Articles for Each Topic**:
   - HTTP Request to NewsAPI with the topic name as query
   - Query parameter: `q: "={{$node["Split In Batches"].json["name"]}}"`

### Efficient Rate Limit Management

To maximize your 100 requests per day:

1. **Batch Processing**:
   - Schedule workflow to run once or twice daily
   - Process multiple topics in a single workflow run

2. **Limit API Calls**:
   - Add a "Limit" node to control request frequency
   - Only fetch new content since last run

3. **Cache Results**:
   - Store results to minimize duplicate requests
   - Use n8n's built-in caching mechanisms

### Content Filtering

Optimize article quality with additional parameters:

1. **Relevancy Filtering**:
   - Use `sortBy=relevancy` to get most relevant articles first
   - Filter out low-quality articles with validation rules

2. **Content Length Filtering**:
   - Add a Function node to check article content length
   - Skip articles with insufficient content
   ```javascript
   // Only process articles with substantial content
   return $input.item.json.content && $input.item.json.content.length > 100;
   ```

## Complete n8n Implementation

Here's a complete example of the n8n node sequence for NewsAPI integration:

1. **Schedule Trigger Node**:
   - Set to run at appropriate intervals (e.g., twice daily)

2. **GraphQL Node**:
   - Fetch topics from Nhost database

3. **Split In Batches Node**:
   - Process each topic individually
   - Input: `data.topics`
   - Batch Size: 1

4. **HTTP Request Node**:
   - Fetch articles from NewsAPI
   - URL: `https://newsapi.org/v2/everything`
   - Query parameters:
     - q: `={{$node["Split In Batches"].json["name"]}}`
     - language: en
     - sortBy: publishedAt
     - pageSize: 5
     - from: `={{$today.subtract(1, "days").format("YYYY-MM-DD")}}`

5. **Error Handler**:
   - Add an "IF" node to check for successful response
   - Condition: `{{$json.status === "ok" && $json.articles && $json.articles.length > 0}}`

6. **Split Articles**:
   - Add a "Split In Batches" node
   - Input: `articles`
   - Batch Size: 1

7. **Check Duplicates**:
   - GraphQL query to check if article exists
   - Skip if already in database

8. **Format Data**:
   - Add a "Function" node to format article data
   ```javascript
   // Format article data
   return {
     json: {
       title: $input.item.json.title || "Untitled",
       url: $input.item.json.url,
       source: $input.item.json.source.name,
       content: $input.item.json.content || $input.item.json.description,
       author: $input.item.json.author || "Unknown",
       published_at: $input.item.json.publishedAt,
       image_url: $input.item.json.urlToImage || ""
     }
   };
   ```

9. **Insert to Database**:
   - GraphQL mutation to insert article

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Double-check your API key
   - Ensure the credential parameter name is exactly "apiKey"
   - Verify your account status on NewsAPI

2. **No Results Returned**:
   - Check if your search terms are too specific
   - Try different search terms or categories
   - Verify API limits haven't been reached

3. **Request Limit Exceeded**:
   - Monitor your daily usage (100 requests per day limit)
   - Implement caching strategies
   - Consider upgrading to a paid plan

4. **Content Quality Issues**:
   - Some articles may have truncated content
   - Image URLs may be missing or invalid
   - Implement validation for required fields

## Security Considerations

1. **API Key Protection**:
   - Always store your NewsAPI key in n8n's credentials manager
   - Never hardcode the API key in workflow nodes

2. **Data Validation**:
   - Implement checks for malicious content
   - Sanitize content before storing in database

3. **Error Logging**:
   - Log API errors for monitoring
   - Avoid exposing sensitive information in logs

## Additional Resources

- [NewsAPI Documentation](https://newsapi.org/docs)
- [n8n Credentials Documentation](https://docs.n8n.io/credentials/newsapi)
- [n8n HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
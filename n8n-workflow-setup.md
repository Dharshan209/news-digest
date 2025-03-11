# n8n Workflow Implementation Guide

This document provides step-by-step instructions for setting up the n8n workflow to automate news fetching, AI processing, and database updates for the News Digest application.

## Prerequisites

1. **Nhost Account Setup**:
   - Create an account at [nhost.io](https://nhost.io)
   - Create a new project
   - Import the `schema.sql` file into Nhost (via Hasura Console)
   - Note your Hasura GraphQL endpoint and admin secret

2. **API Keys**:
   - Get a free NewsAPI key from [newsapi.org](https://newsapi.org)
   - Get an OpenRouter API key from [openrouter.ai](https://openrouter.ai)

3. **n8n Cloud Account**:
   - Sign up at [n8n.cloud](https://n8n.cloud)
   - Create a new workflow

## Step 1: Setting Up Credentials in n8n

1. **NewsAPI Credentials**:
   - In n8n, go to Settings > Credentials
   - Click "Add Credential"
   - Select "API Key Auth" as the type
   - Name: "NewsAPI"
   - API Key Name: "apiKey" (important: use exactly this name)
   - Add your API Key from NewsAPI
   - Save

2. **OpenRouter Credentials**:
   - Add another credential
   - Select "API Key Auth" as the type
   - Name: "OpenRouter"
   - API Key Name: "Authorization" (important: use exactly this name)
   - API Key Value: "Bearer YOUR_OPENROUTER_API_KEY" (include the word "Bearer" followed by a space)
   - Save

3. **Hasura GraphQL Credentials**:
   - Add another credential
   - Select "HTTP Header Auth" as the type
   - Name: "Hasura"
   - Header Parameter Name: "x-hasura-admin-secret"
   - Header Parameter Value: Your Nhost admin secret
   - Save

## Step 2: Creating the User Preferences Workflow

Before setting up the main news processing workflow, create a workflow to manage user preferences:

1. **Create a User Preferences Workflow**:
   - Name it "User Preferences Manager"

2. **Add Schedule Trigger**:
   - Add a "Schedule" node
   - Set it to run every 6 hours
   - Configure: `0 */6 * * *`

3. **Fetch User Preferences Data**:
   - Add a "GraphQL" node
   - Connect to "Schedule" node
   - Select your Hasura credentials
   - URL: Your Hasura GraphQL endpoint
   - Operation: Query
   - Query:
   ```graphql
   query GetAllUserPreferences {
     user_preferences {
       id
       user_id
       keywords
       receive_notifications
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

4. **Process and Cache User Preferences**:
   - Add a "Function" node
   - Connect to "GraphQL" node
   - Code:
   ```javascript
   // Create lookup maps for user preferences
   const userPrefsMap = {};
   const userPrefs = $node["GraphQL"].json.data.user_preferences;
   
   for (const pref of userPrefs) {
     userPrefsMap[pref.user_id] = {
       id: pref.id,
       topics: pref.topics,
       sources: pref.sources,
       keywords: pref.keywords || [],
       receive_notifications: pref.receive_notifications
     };
   }
   
   // Store in workflow variables for use in other workflows
   $workflow.setVariable('userPreferencesMap', JSON.stringify(userPrefsMap));
   
   // Also create a flat list of all topics for simpler processing
   const allTopics = [];
   for (const pref of userPrefs) {
     for (const topic of pref.topics) {
       allTopics.push({
         ...topic,
         user_id: pref.user_id,
         preference_id: pref.id
       });
     }
   }
   
   $workflow.setVariable('allUserTopics', JSON.stringify(allTopics));
   
   return { json: { success: true, userCount: userPrefs.length } };
   ```

## Step 3: Creating the Main News Processing Workflow

### Workflow Overview

Create the main news processing workflow with these components:
1. Scheduled trigger to run at regular intervals
2. Load user preferences from cached data
3. Fetch personalized news articles for each user's topics
4. Process articles with OpenRouter AI
5. Store results in Nhost/Hasura database
6. Filter for user notifications based on preferences

### Detailed Implementation

1. **Create a New Workflow**:
   - Name it "News Processing Workflow"

2. **Add Schedule Trigger Node**:
   - Add a "Schedule" node
   - Set it to run every hour (or preferred interval)
   - Configure: `* */1 * * *` for hourly execution

3. **Load User Preferences**:
   - Add a "Function" node
   - Connect to "Schedule" node
   - Code:
   ```javascript
   // Load user preferences from variables
   let userPreferencesMap = {};
   let allUserTopics = [];
   
   try {
     userPreferencesMap = JSON.parse($workflow.getVariable('userPreferencesMap') || '{}');
     allUserTopics = JSON.parse($workflow.getVariable('allUserTopics') || '[]');
   } catch (error) {
     console.log('Error loading preferences', error);
   }
   
   // If no cached preferences, we'll need to fetch them
   const needToFetchPreferences = Object.keys(userPreferencesMap).length === 0;
   
   return {
     json: {
       userPreferencesMap,
       allUserTopics,
       needToFetchPreferences
     }
   };
   ```

4. **Conditional Fetch of Preferences if Cache Empty**:
   - Add an "IF" node
   - Connect to "Load Preferences" node
   - Condition: `{{$json.needToFetchPreferences}}`

5. **Fetch Preferences if Needed (True branch of IF)**:
   - Add a "GraphQL" node
   - Connect to "IF" node
   - Query the same query as in the User Preferences workflow
   - Add a "Function" node to process the results similar to the cache function

6. **Merge All Results**:
   - Add a "Merge" node to combine results from both branches

7. **Split Topics for Processing**:
   - Add a "Split In Batches" node
   - Connect to "Merge" node
   - Input field: `allUserTopics`
   - Batch Size: 1

5. **Fetch News Articles with User Preferences**:
   - Add an "HTTP Request" node
   - Connect to "Split In Batches" node
   - Method: GET
   - URL: `https://newsapi.org/v2/everything`
   - Authentication: Select NewsAPI credentials
   - Query Parameters:
     - q: `={{$node["Split In Batches"].json["name"]}}`
     - language: en
     - sortBy: publishedAt
     - pageSize: 5
     - sources: `={{
        // Get user's trusted sources
        const userId = $node["Split In Batches"].json.user_id;
        const userPrefs = $node["Merge"].json.userPreferencesMap[userId] || {};
        const sources = userPrefs.sources || [];
        const trustedSources = sources
          .filter(source => source.is_trusted)
          .map(source => source.name)
          .join(',');
        
        return trustedSources || undefined;
     }}`
   - Note: This will fetch 5 recent articles for each topic, filtered by user's trusted sources

6. **Add User Context to Results**:
   - Add a "Function" node
   - Connect to "HTTP Request" node
   - Code:
   ```javascript
   // Add user context to each article
   const userId = $node["Split In Batches"].json.user_id;
   const topicName = $node["Split In Batches"].json.name;
   
   // Ensure articles exist
   if (!$json.articles || !Array.isArray($json.articles)) {
     return { json: { articles: [] } };
   }
   
   // Add user_id and topic to each article
   const articlesWithContext = $json.articles.map(article => ({
     ...article,
     user_id: userId,
     topic: topicName
   }));
   
   return { json: { articles: articlesWithContext } };
   ```

7. **Split Articles for Processing**:
   - Add a "Split In Batches" node named "Split Articles"
   - Connect to "Function" node
   - Input field: `articles`
   - Batch Size: 1
   - This splits the array of articles to process them one by one

8. **Check for Existing Articles**:
   - Add a "GraphQL" node named "Check Existing"
   - Connect to "Split Articles" node
   - Select Hasura credentials
   - URL: Your Hasura GraphQL endpoint
   - Operation: Query
   - Query:
   ```graphql
   query CheckArticle($url: String!) {
     articles(where: {url: {_eq: $url}}) {
       id
     }
   }
   ```
   - Variables: `{"url": "={{$json.url}}"}`

9. **Filter New Articles Only**:
   - Add an "IF" node
   - Connect to "Check Existing" node
   - Condition: `{{$json.data.articles.length === 0}}`
   - This ensures we only process new articles

9. **Process with OpenRouter AI**:
   - Add an "HTTP Request" node named "AI Processing"
   - Connect to "IF" node (True branch)
   - Method: POST
   - URL: `https://openrouter.ai/api/v1/chat/completions`
   - Authentication: Select OpenRouter credentials
   - Headers:
     - Content-Type: application/json
     - HTTP-Referer: your-app-domain.com
   - Request Body:
   ```json
   {
     "model": "anthropic/claude-instant-v1",
     "messages": [
       {
         "role": "system",
         "content": "You are an AI assistant that analyzes news articles. For the given article, provide: 1) A concise summary in 3-4 sentences, 2) A sentiment analysis (positive, negative, or neutral), 3) A brief explanation of the sentiment in 1-2 sentences. Format your response as JSON with keys 'summary', 'sentiment', and 'explanation'."
       },
       {
         "role": "user",
         "content": "Analyze this article: Title: {{$json.title}}\n\nContent: {{$json.description}} {{$json.content}}"
       }
     ],
     "response_format": { "type": "json_object" }
   }
   ```

10. **Parse AI Response**:
    - Add a "JSON Parse" node
    - Connect to "AI Processing" node
    - Property: `choices[0].message.content`
    - This extracts the JSON response from OpenRouter

11. **Insert Article to Database**:
    - Add a "GraphQL" node named "Insert Article"
    - Connect to "JSON Parse" node
    - Select Hasura credentials
    - URL: Your Hasura GraphQL endpoint
    - Operation: Mutation
    - Query:
    ```graphql
    mutation InsertArticle($title: String!, $url: String!, $source: String!, $content: String, $author: String, $published_at: timestamptz!, $image_url: String, $category: String) {
      insert_articles_one(object: {
        title: $title,
        url: $url,
        source: $source,
        content: $content,
        author: $author,
        published_at: $published_at,
        image_url: $image_url,
        category: $category
      }) {
        id
      }
    }
    ```
    - Variables:
    ```json
    {
      "title": "={{$node['Split Articles'].json.title}}",
      "url": "={{$node['Split Articles'].json.url}}",
      "source": "={{$node['Split Articles'].json.source.name}}",
      "content": "={{$node['Split Articles'].json.content}}",
      "author": "={{$node['Split Articles'].json.author || 'Unknown'}}",
      "published_at": "={{$node['Split Articles'].json.publishedAt}}",
      "image_url": "={{$node['Split Articles'].json.urlToImage}}",
      "category": "={{$node['Split Articles'].json.topic}}"
    }
    ```

12. **Insert Summary to Database**:
    - Add a "GraphQL" node named "Insert Summary"
    - Connect to "Insert Article" node
    - Select Hasura credentials
    - URL: Your Hasura GraphQL endpoint
    - Operation: Mutation
    - Query:
    ```graphql
    mutation InsertSummary($article_id: uuid!, $summary: String!) {
      insert_article_summaries_one(object: {
        article_id: $article_id,
        summary: $summary
      }) {
        id
      }
    }
    ```
    - Variables:
    ```json
    {
      "article_id": "={{$node['Insert Article'].json.data.insert_articles_one.id}}",
      "summary": "={{$node['JSON Parse'].json.summary}}"
    }
    ```

13. **Insert Sentiment to Database**:
    - Add a "GraphQL" node named "Insert Sentiment"
    - Connect to "Insert Summary" node
    - Select Hasura credentials
    - URL: Your Hasura GraphQL endpoint
    - Operation: Mutation
    - Query:
    ```graphql
    mutation InsertSentiment($article_id: uuid!, $sentiment: String!, $score: Float!, $explanation: String!) {
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
    - Variables:
    ```json
    {
      "article_id": "={{$node['Insert Article'].json.data.insert_articles_one.id}}",
      "sentiment": "={{$node['JSON Parse'].json.sentiment}}",
      "score": "={{$node['JSON Parse'].json.sentiment === 'positive' ? 0.8 : ($node['JSON Parse'].json.sentiment === 'negative' ? 0.2 : 0.5)}}",
      "explanation": "={{$node['JSON Parse'].json.explanation}}"
    }
    ```

14. **Link Article to User (Save for User)**:
    - Add a "GraphQL" node named "Save Article For User"
    - Connect to "Insert Sentiment" node
    - Select Hasura credentials
    - URL: Your Hasura GraphQL endpoint
    - Operation: Mutation
    - Query:
    ```graphql
    mutation SaveArticleForUser($article_id: uuid!, $user_id: uuid!) {
      insert_saved_articles_one(object: {
        article_id: $article_id,
        user_id: $user_id,
        is_read: false
      }) {
        id
      }
    }
    ```
    - Variables:
    ```json
    {
      "article_id": "={{$node['Insert Article'].json.data.insert_articles_one.id}}",
      "user_id": "={{$node['Split Articles'].json.user_id}}"
    }
    ```

15. **Check Notification Preferences**:
    - Add an "IF" node named "Should Notify"
    - Connect to "Save Article For User" node
    - Condition:
    ```
    {{
      const userId = $node["Split Articles"].json.user_id;
      const userPrefs = $node["Merge"].json.userPreferencesMap[userId] || {};
      return userPrefs.receive_notifications === true;
    }}
    ```

16. **Process Notifications (True branch)**:
    - Add a "Function" node
    - Connect to "Should Notify" node (True branch)
    - Code:
    ```javascript
    // Check if article matches user keywords
    const userId = $node["Split Articles"].json.user_id;
    const userPrefs = $node["Merge"].json.userPreferencesMap[userId] || {};
    const keywords = userPrefs.keywords || [];
    
    const articleTitle = $node["Split Articles"].json.title || '';
    const articleSummary = $node["JSON Parse"].json.summary || '';
    
    // Check if any keywords match
    const matchesKeyword = keywords.length === 0 || keywords.some(keyword => 
      articleTitle.toLowerCase().includes(keyword.toLowerCase()) || 
      articleSummary.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return {
      json: {
        ...($json),
        should_send_notification: matchesKeyword
      }
    };
    ```

17. **Send Notification (Optional)**: 
    - Add additional nodes to send notifications via email, push, etc.
    - Connect to the "Function" node
    - Only send if `should_send_notification` is true

18. **Add Error Handling**:
    - Connect an "Error Trigger" node to the workflow
    - Add a "Send Email" or "Slack" node to notify about errors

19. **Activate the Workflow**:
    - Save the workflow
    - Toggle the "Active" switch to activate it

## Step 4: Creating User Preference Management API

To allow your frontend to manage user preferences, create a dedicated workflow with REST API endpoints:

1. **Create a User Preferences API Workflow**:
   - Name it "User Preferences API"

2. **Add Webhook Nodes for API Endpoints**:
   - Configure the following webhook endpoints:

### Add Topic Endpoint

1. **Add Webhook Node**:
   - Method: POST
   - Path: `/topics/add`
   - Authentication: Basic Auth or Bearer Token (for security)
   - Response Mode: Last Node

2. **Add Function Node for Validation**:
   ```javascript
   // Validate the input
   const input = $json.body || $json;
   
   if (!input.user_id || !input.name) {
     return {
       json: {
         success: false,
         message: 'Missing required fields: user_id and name'
       }
     };
   }
   
   return {
     json: {
       user_id: input.user_id,
       name: input.name,
       description: input.description || ''
     }
   };
   ```

3. **Add GraphQL Node for Preference Lookup**:
   - Query:
   ```graphql
   query GetUserPreferenceId($user_id: uuid!) {
     user_preferences(where: {user_id: {_eq: $user_id}}) {
       id
     }
   }
   ```
   - Variables: `{"user_id": "={{$json.user_id}}"}`

4. **Add GraphQL Node for Topic Addition**:
   - Mutation:
   ```graphql
   mutation AddTopic($preference_id: uuid!, $name: String!, $description: String) {
     insert_topics_one(object: {
       preference_id: $preference_id,
       name: $name,
       description: $description
     }) {
       id
       name
     }
   }
   ```
   - Variables:
   ```json
   {
     "preference_id": "={{$node['Get Preference ID'].json.data.user_preferences[0].id}}",
     "name": "={{$json.name}}",
     "description": "={{$json.description}}"
   }
   ```

5. **Add Function Node for Response Formatting**:
   ```javascript
   return {
     json: {
       success: true,
       message: "Topic added successfully",
       data: $node["Add Topic"].json.data.insert_topics_one
     }
   };
   ```

### Remove Topic Endpoint

1. **Add Webhook Node**:
   - Method: POST
   - Path: `/topics/remove`
   - Authentication: Same as add endpoint

2. **Add Function Node for Validation**:
   ```javascript
   // Validate the input
   const input = $json.body || $json;
   
   if (!input.topic_id) {
     return {
       json: {
         success: false,
         message: 'Missing required field: topic_id'
       }
     };
   }
   
   return {
     json: {
       topic_id: input.topic_id
     }
   };
   ```

3. **Add GraphQL Node for Topic Removal**:
   - Mutation:
   ```graphql
   mutation RemoveTopic($topic_id: uuid!) {
     delete_topics_by_pk(id: $topic_id) {
       id
     }
   }
   ```
   - Variables: `{"topic_id": "={{$json.topic_id}}"}`

### Update Notification Settings Endpoint

1. **Add Webhook Node**:
   - Method: POST
   - Path: `/preferences/notifications`
   - Authentication: Same as other endpoints

2. **Add Function Node for Validation**:
   ```javascript
   // Validate the input
   const input = $json.body || $json;
   
   if (!input.user_id || input.receive_notifications === undefined) {
     return {
       json: {
         success: false,
         message: 'Missing required fields: user_id and receive_notifications'
       }
     };
   }
   
   return {
     json: {
       user_id: input.user_id,
       receive_notifications: !!input.receive_notifications,
       keywords: Array.isArray(input.keywords) ? input.keywords : []
     }
   };
   ```

3. **Add GraphQL Node for Updating Notifications**:
   - Mutation:
   ```graphql
   mutation UpdateNotificationPreferences($user_id: uuid!, $receive_notifications: Boolean!, $keywords: jsonb) {
     update_user_preferences(
       where: {user_id: {_eq: $user_id}},
       _set: {
         receive_notifications: $receive_notifications,
         keywords: $keywords
       }
     ) {
       affected_rows
     }
   }
   ```
   - Variables:
   ```json
   {
     "user_id": "={{$json.user_id}}",
     "receive_notifications": "={{$json.receive_notifications}}",
     "keywords": "={{$json.keywords}}"
   }
   ```

### Get User Preferences Endpoint

1. **Add Webhook Node**:
   - Method: GET
   - Path: `/preferences/:user_id`
   - Authentication: Same as other endpoints

2. **Add GraphQL Node for Fetching Preferences**:
   - Query:
   ```graphql
   query GetUserPreferences($user_id: uuid!) {
     user_preferences(where: {user_id: {_eq: $user_id}}) {
       id
       receive_notifications
       keywords
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
   - Variables: `{"user_id": "={{$parameterItems.user_id}}"}`

3. **Add Function Node for Response Formatting**:
   ```javascript
   // Format the response
   const preferences = $node["Fetch Preferences"].json.data.user_preferences[0];
   
   if (!preferences) {
     return {
       json: {
         success: false,
         message: "User preferences not found"
       }
     };
   }
   
   return {
     json: {
       success: true,
       data: preferences
     }
   };
   ```

## Testing the Workflows

1. **Test the User Preferences API**:
   - Use a tool like Postman to test the REST endpoints
   - Create sample topics and update notification settings
   - Verify the changes in Hasura Console

2. **Test the News Processing Workflow**:
   - Click "Execute Workflow" to run it manually
   - Check the execution log for any errors
   - Verify that articles are fetched based on user topics

3. **Verify in Nhost/Hasura**:
   - Go to Hasura Console in your Nhost project
   - Check the `articles`, `article_summaries`, and `article_sentiments` tables
   - Verify that new records have been created
   - Verify that articles are linked to users via `saved_articles` table

## Optimization Tips

1. **Rate Limiting**:
   - Add "Limit" node to control the flow rate of requests
   - Set it to process 1 item every 2 seconds to respect API rate limits

2. **Error Handling**:
   - Add "Try/Catch" nodes around API calls
   - Configure retry logic for failed API requests:
     - Add a "No Operation, do nothing" node in the catch branch
     - Connect it back to the node before the failed one

3. **Performance**:
   - Use the "Merge" node to combine multiple article results before batch insertion
   - Add "Function" nodes to transform data efficiently before database operations

## Troubleshooting

1. **API Connection Issues**:
   - Verify API credentials format (especially for OpenRouter which requires "Bearer" prefix)
   - Test API endpoints in Postman or cURL before using in n8n
   - Check if free API tiers have request limitations or different endpoints

2. **Database Connection Issues**:
   - Confirm that Hasura GraphQL endpoint is accessible from n8n cloud
   - Double-check admin secret format (no extra spaces)
   - Verify table permissions in Hasura Console

3. **Workflow Execution Issues**:
   - Inspect data at each node using the n8n debugger
   - Add "Set" nodes to see and modify data between steps
   - Check for null values that could cause failures

4. **NewsAPI Specific Issues**:
   - Free tier limits to 100 requests per day
   - Only provides articles from past 30 days
   - May return limited content fields

5. **OpenRouter Specific Issues**:
   - Check if response format follows expected structure
   - Ensure the model you're using is available in your subscription
   - Model names may change, verify current naming convention

## Security Considerations

1. **API Key Protection**:
   - Store all API keys in n8n credentials manager
   - Never expose admin secrets in workflow configuration

2. **Data Protection**:
   - Ensure Hasura RLS policies are properly configured
   - Avoid storing sensitive information from articles

3. **Network Security**:
   - Use HTTPS for all API communications
   - Consider setting up IP restrictions in Nhost security settings

## Maintenance Tips

1. **Regular Testing**:
   - Create a test version of the workflow that runs on a small dataset
   - Run it weekly to ensure all integrations still work

2. **Monitoring**:
   - Set up execution notifications for workflow failures
   - Create a dashboard to track successful article processing

3. **Updates**:
   - Check for API changes in NewsAPI and OpenRouter
   - Update model names and parameters as newer versions become available
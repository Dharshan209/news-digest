# User Preferences Implementation Guide

This document provides detailed instructions for implementing user preferences in the n8n workflow for the News Digest application.

## Overview

User preferences are a key feature of the News Digest application, allowing users to:

1. Define topics of interest
2. Select preferred news sources
3. Set notification preferences
4. Configure content filtering options

This implementation guide focuses on how to integrate these preferences into the n8n workflow to personalize news fetching and processing.

## Database Schema Overview

The user preferences are stored in the following tables in the Nhost database:

1. **user_preferences**: Core preferences table linked to user accounts
2. **topics**: User-defined topics of interest 
3. **sources**: User-preferred news sources

Refer to the schema.sql file for the detailed structure.

## Step 1: Setting Up User Preferences Workflow

### Create a New Workflow

1. In n8n, create a new workflow named "User Preferences Manager"
2. This workflow will run alongside the main News Processing workflow

### Add Trigger Nodes

Create multiple trigger options:

1. **Webhook Trigger**:
   - For real-time updates when users change preferences
   - Configure a webhook endpoint in n8n
   - Expose this endpoint to your frontend application

2. **Schedule Trigger**:
   - For periodic synchronization of preferences
   - Set to run daily to ensure all workflows use the latest preferences

## Step 2: Implementing User Topic Management

### Fetch User Topics

1. Add a "GraphQL" node:
   - Connect to the trigger node
   - Select your Hasura credentials
   - URL: Your Hasura GraphQL endpoint
   - Operation: Query
   - Query:
   ```graphql
   query GetAllUserTopics {
     user_preferences {
       id
       user_id
       topics {
         id
         name
         description
       }
     }
   }
   ```

2. Add a "Split In Batches" node:
   - Connect to the GraphQL node
   - Input field: `data.user_preferences`
   - Batch Size: 1
   - This allows processing each user's preferences individually

### Create Topic Cache for Workflow

1. Add a "Function" node to format topics for caching:
   ```javascript
   // Create a map of user_id -> topics for efficient lookup
   const userTopicsMap = {};
   
   // Input contains all user preferences
   const userPrefs = $node["GraphQL"].json.data.user_preferences;
   
   // Organize by user ID
   for (const userPref of userPrefs) {
     userTopicsMap[userPref.user_id] = {
       preference_id: userPref.id,
       topics: userPref.topics.map(topic => ({
         id: topic.id,
         name: topic.name,
         description: topic.description
       }))
     };
   }
   
   // Store in workflow variable for other workflows to access
   $workflow.setVariable('userTopicsMap', JSON.stringify(userTopicsMap));
   
   return { json: { success: true } };
   ```

2. This creates a cached map of user preferences that can be accessed by other workflows.

## Step 3: Implementing Source Preferences

### Fetch User Sources

1. Add another "GraphQL" node:
   - Connect to the trigger node (in parallel with the topics query)
   - Select your Hasura credentials
   - URL: Your Hasura GraphQL endpoint
   - Operation: Query
   - Query:
   ```graphql
   query GetAllUserSources {
     user_preferences {
       id
       user_id
       sources {
         id
         name
         url
         is_trusted
       }
     }
   }
   ```

2. Add a "Function" node to format sources for caching:
   ```javascript
   // Create a map of user_id -> sources for efficient lookup
   const userSourcesMap = {};
   
   // Input contains all user preferences
   const userPrefs = $node["GraphQL_Sources"].json.data.user_preferences;
   
   // Organize by user ID
   for (const userPref of userPrefs) {
     userSourcesMap[userPref.user_id] = {
       preference_id: userPref.id,
       sources: userPref.sources.map(source => ({
         id: source.id,
         name: source.name,
         url: source.url,
         is_trusted: source.is_trusted
       }))
     };
   }
   
   // Store in workflow variable for other workflows to access
   $workflow.setVariable('userSourcesMap', JSON.stringify(userSourcesMap));
   
   return { json: { success: true } };
   ```

## Step 4: Implementing Notification Preferences

### Fetch Notification Settings

1. Add a "GraphQL" node for notification preferences:
   - Connect to the trigger node
   - Query:
   ```graphql
   query GetNotificationPreferences {
     user_preferences {
       id
       user_id
       receive_notifications
       keywords
     }
   }
   ```

2. Add a "Function" node to format notification preferences:
   ```javascript
   // Create a map of user_id -> notification preferences
   const userNotificationsMap = {};
   
   const userPrefs = $node["GraphQL_Notifications"].json.data.user_preferences;
   
   for (const userPref of userPrefs) {
     userNotificationsMap[userPref.user_id] = {
       receive_notifications: userPref.receive_notifications,
       keywords: userPref.keywords || []
     };
   }
   
   $workflow.setVariable('userNotificationsMap', JSON.stringify(userNotificationsMap));
   
   return { json: { success: true } };
   ```

## Step 5: Creating REST API Endpoints for Preference Management

### Add Webhook Triggers for Frontend Integration

Create webhook endpoints that your frontend can call to manage preferences:

1. **Add Topic Endpoint**:
   - Add a "Webhook" node
   - Method: POST
   - Path: `/topics/add`
   - Response Mode: Last Node

2. **Add Processing for Topic Addition**:
   - Add a "Function" node to validate input:
   ```javascript
   // Validate required fields
   const input = $json;
   
   if (!input.user_id || !input.topic_name) {
     return {
       json: {
         success: false,
         message: 'Missing required fields: user_id and topic_name'
       }
     };
   }
   
   return {
     json: {
       user_id: input.user_id,
       topic_name: input.topic_name,
       description: input.description || null
     }
   };
   ```

3. **Add GraphQL Mutation Node**:
   - Connect to the validation function
   - Operation: Mutation
   - Query:
   ```graphql
   mutation AddUserTopic($user_id: uuid!, $topic_name: String!, $description: String) {
     insert_topics_one(object: {
       name: $topic_name,
       description: $description,
       preference_id: (SELECT id FROM user_preferences WHERE user_id = $user_id)
     }) {
       id
       name
     }
   }
   ```
   - Variables:
   ```json
   {
     "user_id": "={{$json.user_id}}",
     "topic_name": "={{$json.topic_name}}",
     "description": "={{$json.description}}"
   }
   ```

4. Repeat similar patterns for:
   - Delete Topic (/topics/delete)
   - Add Source (/sources/add)
   - Delete Source (/sources/delete)
   - Update Notification Settings (/notifications/update)

## Step 6: Integrating Preferences with News Fetching Workflow

### Modify the News Processing Workflow

1. Add a "Code" node at the beginning of the workflow to load user preferences:
   ```javascript
   // Load user preferences from variables
   let userTopicsMap = {};
   let userSourcesMap = {};
   let userNotificationsMap = {};
   
   try {
     userTopicsMap = JSON.parse($workflow.getVariable('userTopicsMap') || '{}');
     userSourcesMap = JSON.parse($workflow.getVariable('userSourcesMap') || '{}');
     userNotificationsMap = JSON.parse($workflow.getVariable('userNotificationsMap') || '{}');
   } catch (error) {
     // Handle parsing error
     console.log('Error loading preferences', error);
   }
   
   return {
     json: {
       userTopicsMap,
       userSourcesMap,
       userNotificationsMap
     }
   };
   ```

2. Add a "GraphQL" node to fetch user preferences if cache is empty:
   - Connect to the Code node
   - Operation: Query
   - Use an IF node to only run this if the cache is empty

### Personalized News Fetching

1. Modify your "Split In Batches" node for topics:
   - Instead of using all topics, use topics per user:
   ```javascript
   // Flatten user topics into an array with user context
   const userIds = Object.keys(userTopicsMap);
   const allUserTopics = [];
   
   for (const userId of userIds) {
     const userTopics = userTopicsMap[userId].topics || [];
     for (const topic of userTopics) {
       allUserTopics.push({
         ...topic,
         user_id: userId
       });
     }
   }
   
   return {
     json: {
       userTopics: allUserTopics
     }
   };
   ```

2. Update your NewsAPI HTTP Request node:
   - Use the topic from the user's preferences
   - Add source filtering based on user preferences:
   ```
   sources: "={{
     // Get user's trusted sources
     const userId = $node["Split Topics"].json.user_id;
     const userSources = $json.userSourcesMap[userId]?.sources || [];
     const trustedSources = userSources
       .filter(source => source.is_trusted)
       .map(source => source.name)
       .join(',');
     
     return trustedSources || undefined;
   }}"
   ```

## Step 7: Implementing Personalized Article Storage

Update your database operations to track which articles are for which users:

1. Add user context to articles when storing:
   - Modify the "Insert Article" GraphQL node:
   ```graphql
   mutation InsertArticleForUser($title: String!, $url: String!, $source: String!, $content: String, $user_id: uuid!) {
     # Insert article first
     insert_articles_one(object: {
       title: $title,
       url: $url,
       source: $source,
       content: $content
       # other fields
     }) {
       id
       # After inserting, also create a saved_article record for this user
       saved_articles {
         id
         user_id
       }
     }
   }
   ```

2. Add a follow-up node to create the saved_article entry:
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
     "user_id": "={{$node['Split Topics'].json.user_id}}"
   }
   ```

## Step 8: Implementing Notification Filtering

Add a node to filter articles for notifications based on user preferences:

1. Add an "IF" node after processing each article:
   - Condition:
   ```
   {{
     const userId = $node["Split Topics"].json.user_id;
     const userNotifs = $json.userNotificationsMap[userId] || {};
     return userNotifs.receive_notifications === true;
   }}
   ```

2. For the "true" branch, add another node to check keyword matches:
   ```javascript
   const userId = $node["Split Topics"].json.user_id;
   const userNotifs = $json.userNotificationsMap[userId] || {};
   const keywords = userNotifs.keywords || [];
   const articleTitle = $json.title || '';
   const articleContent = $json.content || '';
   
   // Check if any keywords match in the article
   const matchesKeyword = keywords.some(keyword => 
     articleTitle.toLowerCase().includes(keyword.toLowerCase()) || 
     articleContent.toLowerCase().includes(keyword.toLowerCase())
   );
   
   return {
     json: {
       ...$json,
       should_notify: matchesKeyword
     }
   };
   ```

3. Add nodes to send notifications for matching articles (email, push notification, etc.)

## Workflow Testing Steps

1. **Create Test Users**:
   - Add test user accounts in Nhost
   - Create preferences for each test user

2. **Test Topic Processing**:
   - Add various topics to different test users
   - Run the workflow and verify that articles are fetched per user topic

3. **Test Source Filtering**:
   - Add trusted and untrusted sources
   - Verify that articles are filtered according to source preferences

4. **Test Notifications**:
   - Set up notification preferences
   - Verify that notifications are sent according to settings

## Security Considerations

1. **Authentication**:
   - All API endpoints must validate user authentication
   - Use Nhost JWT tokens for secure access

2. **Data Isolation**:
   - Ensure strict Row Level Security (RLS) in Hasura
   - Verify that users can only access their own preferences

3. **Input Validation**:
   - Sanitize all user inputs before processing
   - Validate data types and constraints

## Performance Optimizations

1. **Caching Strategy**:
   - Cache user preferences for 24 hours
   - Implement cache invalidation when preferences change

2. **Batch Processing**:
   - Process user preferences in batches
   - Group API calls to minimize database load

3. **Parallel Processing**:
   - Use n8n's parallel execution for independent operations
   - Schedule heavy operations during off-peak hours
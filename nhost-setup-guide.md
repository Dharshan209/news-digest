# Nhost Backend Setup Guide

This guide provides step-by-step instructions for setting up the Nhost backend for your News Digest application.

## What is Nhost?

Nhost is an open-source backend-as-a-service (BaaS) that combines:
- PostgreSQL database
- Hasura GraphQL API
- Authentication
- Storage
- Serverless functions

For this project, we'll use Nhost to store and manage news articles, user preferences, and AI-processed content.

## Step 1: Create a Nhost Account

1. Go to [nhost.io](https://nhost.io)
2. Sign up for a new account
3. Verify your email

## Step 2: Create a New Project

1. From the Nhost dashboard, click "Create New App"
2. Choose a name for your project (e.g., "news-digest")
3. Select a region close to your target audience
4. Choose PostgreSQL as the database
5. Click "Create App"

## Step 3: Configure the Database Schema

1. From your Nhost project dashboard, click "Hasura Console"
2. Navigate to the "SQL" tab
3. Copy and paste the entire `schema.sql` file content
4. Click "Run" to execute the SQL statements

Alternatively, you can use the Nhost CLI to import the schema:

```bash
# Install Nhost CLI
npm install -g nhost

# Login to your Nhost account
nhost login

# Initialize a local project
nhost init

# Import the schema
nhost db push --schema path/to/schema.sql

# Deploy changes
nhost deploy
```

## Step 4: Configure Hasura Permissions

For security, you need to set up Row Level Security (RLS) policies for your tables. These policies are included in the `schema.sql` file, but verify they're properly set:

1. In Hasura Console, go to "Data" > "public" > Select each table
2. Check the "Row Security" tab to ensure policies are applied
3. For each table, ensure:
   - Authentication permissions are correct
   - Row-level policies are enabled
   - The policies match what's in `schema.sql`

## Step 5: Set Up Authentication

1. In the Nhost dashboard, go to "Authentication" > "Providers"
2. Enable Email/Password authentication (enabled by default)
3. Optionally, configure other providers (Google, GitHub, etc.)
4. Configure email templates for verification, password reset, etc.

## Step 6: Get Your API Endpoints and Keys

For integration with n8n, you'll need:

1. **GraphQL Endpoint**: Found in "APIs" > "GraphQL API"
2. **Admin Secret**: Found in "Settings" > "Secrets" 
   - IMPORTANT: This is a sensitive key, don't share it publicly
   - This will be used for admin operations in n8n

## Step 7: Enable Storage (Optional)

If you plan to store images or other files:

1. Go to "Storage" in the Nhost dashboard
2. Create necessary buckets (e.g., "article-images")
3. Configure access permissions

## Step 8: Connect Your Frontend

Update the Nhost configuration in your frontend application:

```javascript
// src/lib/nhost.js
import { NhostClient } from '@nhost/nhost-js';

const nhost = new NhostClient({
  subdomain: 'YOUR-NHOST-APP-SUBDOMAIN',
  region: 'YOUR-NHOST-APP-REGION'
});

export { nhost };
```

Replace `YOUR-NHOST-APP-SUBDOMAIN` and `YOUR-NHOST-APP-REGION` with your actual Nhost app values.

## Step 9: Test Your Setup

1. Create a test user account via the Authentication dashboard
2. Add test data to verify your schema works correctly
3. Test GraphQL queries through the Hasura Console

## Database Schema Overview

The schema includes the following tables:

1. **user_preferences**: Stores user preferences for news topics
2. **topics**: Stores topics of interest for each user
3. **sources**: Stores news sources preferred by users
4. **articles**: Stores news articles fetched from NewsAPI
5. **article_summaries**: Stores AI-generated summaries
6. **article_sentiments**: Stores sentiment analysis results
7. **saved_articles**: Tracks which articles users have saved

## GraphQL API Usage

### Fetch User Preferences

```graphql
query GetUserPreferences {
  user_preferences(where: {user_id: {_eq: "USER_ID"}}) {
    id
    keywords
    receive_notifications
    topics {
      id
      name
    }
  }
}
```

### Fetch Articles with Summaries and Sentiments

```graphql
query GetArticles {
  articles(order_by: {published_at: desc}, limit: 10) {
    id
    title
    url
    source
    published_at
    article_summaries {
      summary
    }
    article_sentiments {
      sentiment
      explanation
    }
  }
}
```

## Integration with n8n

For your n8n integration:

1. **GraphQL Node Authentication**:
   - Use the HTTP Header Auth type
   - Header Parameter Name: `x-hasura-admin-secret`
   - Header Parameter Value: Your Nhost admin secret

2. **GraphQL Endpoint**:
   - Use your Hasura GraphQL endpoint (e.g., `https://xxxxxxxx.hasura.app/v1/graphql`)

3. **GraphQL Operations**:
   - Use the queries and mutations defined in `hasura-graphql-operations.md`

## Security Considerations

1. **Never expose your admin secret**:
   - Store it securely in n8n credentials
   - Don't include it in client-side code

2. **Row Level Security**:
   - Ensure RLS policies are properly configured for all tables
   - Test that users can only access their own data

3. **JWT Authentication**:
   - For user-specific operations, use JWT authentication
   - Pass the JWT token in the `Authorization` header

## Monitoring and Maintenance

1. **Database Logs**:
   - Monitor database logs for errors or performance issues
   - Available in the Nhost dashboard under "Logs"

2. **GraphQL Operations**:
   - Track slow queries in the Hasura Console
   - Optimize queries with proper indexes

3. **Backups**:
   - Enable automatic backups in Nhost settings
   - Consider manual backups for critical data

## Scaling Considerations

As your application grows:

1. **Database Indexes**:
   - Add indexes for frequently queried columns
   - Monitor query performance

2. **Rate Limiting**:
   - Implement rate limiting for public endpoints
   - Configure through Hasura Cloud (available on paid plans)

3. **Caching**:
   - Enable GraphQL caching for read-heavy operations
   - Configure in Hasura settings

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**:
   - Check Row Level Security policies
   - Verify user authentication is working correctly

2. **GraphQL Errors**:
   - Check field names and types match the schema
   - Ensure required arguments are provided

3. **Database Connection Issues**:
   - Check Nhost status page for outages
   - Verify your connection settings

### Getting Support

If you encounter problems:
1. Check the [Nhost documentation](https://docs.nhost.io)
2. Search the [Nhost GitHub issues](https://github.com/nhost/nhost/issues)
3. Join the [Nhost Discord community](https://discord.com/invite/nhost)

## Next Steps

After setting up your Nhost backend:

1. Complete the n8n workflow setup following the `n8n-workflow-setup.md` guide
2. Connect your frontend application to Nhost
3. Test the end-to-end flow from news fetching to display
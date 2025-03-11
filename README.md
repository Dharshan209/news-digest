# News Digest Application with Automated Content Processing

This project implements an end-to-end news aggregation system that automatically fetches, processes, and delivers personalized news content to users.

## Deployment

This project is configured for deployment on Vercel. To deploy:

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will automatically detect the Vite configuration and deploy the application

### Manual Deployment

You can also deploy manually using the Vercel CLI:

```bash
# Install Vercel CLI if you don't have it
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
vercel
```

## Core Features

1. **News Fetching**: Automatically retrieves articles from free news APIs based on user-defined topics
2. **AI-Powered Processing**: Utilizes OpenRouter for article summarization and sentiment analysis
3. **Persistent Storage**: Stores all processed data in a Nhost/Hasura backend
4. **User Personalization**: Delivers content based on user preferences and interests

## Technical Implementation

### Backend Infrastructure

- **Nhost**: Provides backend-as-a-service with PostgreSQL database, authentication, and storage
- **Hasura GraphQL**: Provides a GraphQL API layer for database interaction
- **OpenRouter API**: Connects to various AI models for content processing
- **NewsAPI**: Serves as the primary source for fresh news content
- **n8n**: Automates workflows to fetch, process, and store news data

### Automation Flow

1. **Data Collection**: Scheduled processes fetch news articles matching user topics
2. **AI Processing**:
   - Article summarization extracts key information
   - Sentiment analysis determines the emotional tone
   - Content categorization sorts articles by topic
3. **Data Storage**: Processed articles and metadata are stored in the database
4. **User Access**: Frontend application presents personalized content

### Integration Details

The system integrates multiple services:

1. **User Preferences Management**:
   - Users define topics of interest
   - Preference settings control notification frequency
   - Topic following/unfollowing

2. **News Source Integration**:
   - Direct API connections to news providers
   - Parameter-based filtering (topics, language, freshness)
   - Rate-limit compliant scheduling

3. **AI Processing Pipeline**:
   - Summarization for quick content consumption
   - Sentiment scoring for emotional context
   - Explanation of sentiment factors

4. **Database Schema**:
   - Normalized tables for articles, summaries, and sentiments
   - User preference mappings
   - History tracking for user interactions

## Getting Started

### Running the Project Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/news-digest.git
   cd news-digest
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file with the following variables:
   ```
   VITE_NHOST_SUBDOMAIN=your-nhost-subdomain
   VITE_NHOST_REGION=your-nhost-region
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

6. **Deploy to Vercel**:
   ```bash
   npm run deploy
   ```

### Required Services

This application requires the following accounts and configurations:

- **Nhost Account**: For backend services
  - Create an account at [nhost.io](https://nhost.io)
  - Set up a new project and import the schema.sql file
  - Configure Row Level Security for data protection
  - Get your GraphQL endpoint and Admin Secret

- **n8n Cloud Account**: For workflow automation
  - Sign up at [n8n.cloud](https://n8n.cloud)
  - Set up the News Fetching, AI Processing, and Data Update workflow

- **OpenRouter API Key**: For AI processing capabilities
  - Sign up at [openrouter.ai](https://openrouter.ai)
  - Create an API key for accessing AI models

- **Free News API Access**: For content retrieval
  - Get an API key from [newsapi.org](https://newsapi.org) or another free news API

## n8n Workflow Setup

1. **Authentication Setup**:
   - Store API keys in n8n credentials manager
   - Configure Hasura GraphQL credentials with Admin Secret

2. **News Fetching Workflow**:
   - Trigger: Schedule (e.g., hourly)
   - HTTP Request node to fetch articles from NewsAPI based on user-defined topics
   - Filter out already processed articles by checking against database

3. **AI Processing Workflow**:
   - HTTP Request node to send article content to OpenRouter
   - Parse response to extract summarization and sentiment analysis
   - Format data for database insertion

4. **Data Update Workflow**:
   - GraphQL node to insert new articles into Nhost/Hasura database
   - GraphQL node to create article summaries
   - GraphQL node to create article sentiments
   - Error handling for failed operations

## Usage Example

Once configured, the system will:

1. Regularly fetch new articles matching user interests
2. Process each article with AI for summarization and analysis
3. Store the enriched content in the database
4. Make content available through GraphQL API for frontend consumption

## Security Considerations

- API keys are stored securely in n8n credentials manager
- User data is protected with proper authentication
- Hasura permissions ensure data access control
- All API connections use HTTPS for security

## Future Enhancements

- Enhanced topic extraction using NLP
- User feedback loops for preference refinement
- Multi-language support
- Content recommendation engine

## Troubleshooting

### Common Issues

1. **Authentication Issues**:
   - Ensure your Nhost subdomain and region are correctly set in environment variables
   - Check that you've properly signed up and are logged in

2. **No Articles Showing**:
   - Verify n8n workflows are running correctly
   - Check the GraphQL queries for articles in the database
   - Ensure NewsAPI integration is working properly

3. **Deployment Problems**:
   - Make sure NODE_VERSION is set to 18.x in your Vercel environment
   - Check that all required environment variables are set
   - Use the custom build script specified in vercel-build.sh

### Getting Help

For additional help, please open an issue on GitHub with detailed information about your problem.
# OpenRouter Integration Guide

This document provides detailed instructions for integrating OpenRouter with n8n to perform AI-powered article summarization and sentiment analysis.

## OpenRouter Overview

OpenRouter is a unified API gateway that provides access to various AI models. For this project, we'll use it to:

1. Summarize news articles
2. Analyze sentiment (positive, negative, or neutral)
3. Generate explanations for sentiment scores

## Setup Steps

### 1. OpenRouter Account Setup

1. Create an account at [OpenRouter](https://openrouter.ai)
2. Generate an API key in your account settings
3. Note your API key for use in n8n

### 2. Model Selection

For news article processing, we recommend the following models:

- **Article Summarization**: Anthropic Claude (balanced between quality and cost)
- **Sentiment Analysis**: OpenAI GPT-4 or Anthropic Claude (both provide good sentiment analysis)

You can specify the model in your API requests:
- `anthropic/claude-instant-v1` - Faster, less expensive
- `anthropic/claude-3-opus-20240229` - Higher quality, more expensive
- `openai/gpt-4` - High quality, balanced cost

## API Integration in n8n

### Creating the OpenRouter HTTP Request Node

In your n8n workflow, add an HTTP Request node with the following configuration:

#### Basic Configuration:
- **Method**: POST
- **URL**: `https://openrouter.ai/api/v1/chat/completions`
- **Authentication**: API Key
  - **API Key Name**: Authorization
  - **API Key Value**: Bearer YOUR_OPENROUTER_API_KEY (include the word "Bearer" followed by a space)
- **Headers**:
  - `Content-Type`: `application/json`
  - `HTTP-Referer`: `https://yourwebsite.com` (replace with your actual website)

#### Request Body for Article Analysis:

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

Make sure the variable references match your node structure in n8n.

### Parsing the OpenRouter Response

Add a JSON Parse node after the HTTP Request to extract the generated content:

- **Property to Extract**: `choices[0].message.content`

This will give you a JSON object with the following structure:

```json
{
  "summary": "This is a summary of the article...",
  "sentiment": "positive",
  "explanation": "The article presents a positive outlook on the technology..."
}
```

You can then use this parsed data in subsequent nodes to update your Nhost database.

## Customizing Prompts

You can customize the system prompt to get different types of analysis:

### Detailed Analysis Prompt

```
You are an AI assistant that analyzes news articles in depth. For the given article, provide:
1) A detailed summary in 5-6 sentences covering all key points
2) A nuanced sentiment analysis on a 5-point scale (very negative, negative, neutral, positive, very positive)
3) An explanation of the sentiment with specific examples from the text
4) Key entities mentioned in the article (people, organizations, locations)
5) Main topics or categories this article belongs to

Format your response as JSON with keys 'summary', 'sentiment', 'explanation', 'entities', and 'topics'.
```

### Concise Analysis Prompt

```
You are an AI assistant that analyzes news articles concisely. For the given article, provide:
1) A brief summary in 1-2 sentences
2) A simple sentiment (positive, negative, or neutral)
3) One key takeaway

Format your response as JSON with keys 'summary', 'sentiment', and 'takeaway'.
```

## Error Handling

When integrating with OpenRouter, implement these error handling strategies:

1. **Rate Limiting**: OpenRouter may have rate limits. Add "Limit" nodes in n8n to control request frequency.

2. **Timeout Handling**: Set appropriate timeouts in the HTTP Request node (15-30 seconds recommended).

3. **Error Capturing**: Use "Try/Catch" nodes around the OpenRouter request to handle failures.

4. **Response Validation**: Add an IF node after parsing to check if the response contains the expected fields:
   ```
   {{$json.hasOwnProperty('summary') && $json.hasOwnProperty('sentiment') && $json.hasOwnProperty('explanation')}}
   ```

## Cost Optimization

To optimize costs when using OpenRouter:

1. **Model Selection**: Use cheaper models for basic tasks
   - `anthropic/claude-instant-v1` is more cost-effective than `claude-3-opus`

2. **Input Truncation**: Add a Function node to limit article length:
   ```javascript
   // Truncate content to first 1000 words
   const words = $input.item.json.content.split(' ');
   const truncatedContent = words.slice(0, 1000).join(' ');
   
   return {
     json: {
       ...$input.item.json,
       content: truncatedContent
     }
   };
   ```

3. **Batching**: Use n8n's scheduling to process articles during off-peak hours.

4. **Caching**: Consider implementing a simple cache using n8n variables for frequently processed content.

## Complete n8n Implementation

Here's a complete example of the n8n node sequence for OpenRouter integration:

1. **Split In Batches Node**:
   - Process articles one by one

2. **Function Node** (Format Article):
   ```javascript
   // Combine title and content, truncate if needed
   const title = $input.item.json.title || "";
   const description = $input.item.json.description || "";
   const content = $input.item.json.content || "";
   
   // Limit to ~1000 words total
   const combined = title + "\n\n" + description + " " + content;
   const words = combined.split(' ');
   const truncated = words.slice(0, 1000).join(' ');
   
   return {
     json: {
       ...$input.item.json,
       processedContent: truncated
     }
   };
   ```

3. **HTTP Request Node** (OpenRouter Request):
   - Configure as described above
   - Request body:
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
         "content": "Analyze this article: {{$json.processedContent}}"
       }
     ],
     "response_format": { "type": "json_object" }
   }
   ```

4. **JSON Parse Node** (Extract Response):
   - Property: `choices[0].message.content`

5. **IF Node** (Validate Response):
   - Condition: `{{$json.hasOwnProperty('summary') && $json.hasOwnProperty('sentiment')}}`

6. **Set Node** (Prepare Database Input):
   ```javascript
   return {
     json: {
       article_id: $input.item.json.article_id,
       summary: $json.summary,
       sentiment: $json.sentiment,
       score: $json.sentiment === 'positive' ? 0.8 : ($json.sentiment === 'negative' ? 0.2 : 0.5),
       explanation: $json.explanation
     }
   };
   ```

7. **GraphQL Node** (Update Database):
   - Insert the processed data into your Nhost database

## Security Considerations

1. **API Key Protection**: 
   - Never include your API key directly in the workflow
   - Use n8n's credentials manager to store the key
   - Include "Bearer " prefix with your API key

2. **Data Privacy**: 
   - Be selective about what article data you send to external AI models
   - Consider removing sensitive information before processing

3. **Error Handling**:
   - Add proper error handling for failed requests
   - Log errors without exposing sensitive information

## Troubleshooting

### Common Issues and Solutions

1. **400 Bad Request**:
   - Check if your OpenRouter API key is properly formatted with "Bearer " prefix
   - Verify your JSON request body format
   - Make sure the model name is correctly specified

2. **401 Unauthorized**:
   - Verify your API key is correct and not expired
   - Ensure the Authorization header is properly configured
   - Check if your OpenRouter account has sufficient credits

3. **Parsing Issues**:
   - Validate that the AI response is properly formatted JSON
   - Add error handling around the JSON parsing
   - Check if the model is returning the expected format

4. **Missing Fields in Response**:
   - Ensure your prompt clearly requests all required fields
   - Add validation to check for required fields
   - Implement fallback values for missing fields

For additional support, refer to the [OpenRouter documentation](https://openrouter.ai/docs).
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useUserData } from '@nhost/react';
import Layout from '../components/Layout';
import NewsCard from '../components/NewsCard';
import { useToast } from '../contexts/ToastContext';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const GET_ALL_ARTICLES = gql`
  query GetAllArticles($offset: Int!, $limit: Int!, $user_id: uuid!) {
    articles(
      offset: $offset
      limit: $limit
      order_by: { published_at: desc }
    ) {
      id
      title
      source
      published_at
      image_url
      url
      article_summaries {
        summary
      }
      article_sentiments {
        sentiment
        score
      }
      saved_articles(where: { user_id: { _eq: $user_id } }) {
        is_read
        id
      }
    }
  }
`;

const GET_ARTICLES_BY_CATEGORY = gql`
  query GetArticlesByCategory($offset: Int!, $limit: Int!, $category: String!, $user_id: uuid!) {
    articles(
      offset: $offset
      limit: $limit
      where: { 
        category: { _eq: $category }
      }
      order_by: { published_at: desc }
    ) {
      id
      title
      source
      published_at
      image_url
      url
      article_summaries {
        summary
      }
      article_sentiments {
        sentiment
        score
      }
      saved_articles(where: { user_id: { _eq: $user_id } }) {
        is_read
        id
      }
    }
  }
`;

const SAVE_ARTICLE = gql`
  mutation SaveArticle($user_id: uuid!, $article_id: uuid!) {
    insert_saved_articles_one(object: {
      user_id: $user_id, 
      article_id: $article_id,
      is_read: false
    }) {
      id
    }
  }
`;

const DELETE_SAVED_ARTICLE = gql`
  mutation DeleteSavedArticle($id: uuid!) {
    delete_saved_articles_by_pk(id: $id) {
      id
    }
  }
`;

export default function Dashboard() {
  const [currentTopic, setCurrentTopic] = useState(null);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 10;
  const user = useUserData();
  const { addToast } = useToast();
  
  const [saveArticle] = useMutation(SAVE_ARTICLE);
  const [deleteSavedArticle] = useMutation(DELETE_SAVED_ARTICLE);

  // Define separate queries based on search state
  const getAllArticlesQuery = useCallback(() => {
    if (searchQuery) {
      return gql`
        query GetArticlesWithSearch($offset: Int!, $limit: Int!, $user_id: uuid!, $search: String!) {
          articles(
            offset: $offset
            limit: $limit
            order_by: { published_at: desc }
            where: {
              _or: [
                { title: { _ilike: $search } },
                { content: { _ilike: $search } }
              ]
            }
          ) {
            id
            title
            source
            published_at
            image_url
            url
            article_summaries {
              summary
            }
            article_sentiments {
              sentiment
              score
            }
            saved_articles(where: { user_id: { _eq: $user_id } }) {
              is_read
              id
            }
          }
        }
      `;
    }
    return GET_ALL_ARTICLES;
  }, [searchQuery]);

  const getCategoryArticlesQuery = useCallback(() => {
    if (searchQuery) {
      return gql`
        query GetCategoryArticlesWithSearch($offset: Int!, $limit: Int!, $category: String!, $user_id: uuid!, $search: String!) {
          articles(
            offset: $offset
            limit: $limit
            where: {
              category: { _eq: $category },
              _or: [
                { title: { _ilike: $search } },
                { content: { _ilike: $search } }
              ]
            }
            order_by: { published_at: desc }
          ) {
            id
            title
            source
            published_at
            image_url
            url
            article_summaries {
              summary
            }
            article_sentiments {
              sentiment
              score
            }
            saved_articles(where: { user_id: { _eq: $user_id } }) {
              is_read
              id
            }
          }
        }
      `;
    }
    return GET_ARTICLES_BY_CATEGORY;
  }, [searchQuery]);

  const searchVariable = useMemo(() => {
    return searchQuery ? `%${searchQuery}%` : '';
  }, [searchQuery]);

  const { 
    loading: allArticlesLoading, 
    error: allArticlesError, 
    data: allArticlesData, 
    refetch: refetchAllArticles 
  } = useQuery(getAllArticlesQuery(), {
    variables: {
      offset: page * limit,
      limit,
      user_id: user?.id,
      ...(searchQuery && { search: searchVariable })
    },
    skip: !user?.id || !!currentTopic,
    fetchPolicy: 'cache-and-network',
  });

  const { 
    loading: categoryArticlesLoading, 
    error: categoryArticlesError, 
    data: categoryArticlesData, 
    refetch: refetchCategoryArticles 
  } = useQuery(getCategoryArticlesQuery(), {
    variables: {
      offset: page * limit,
      limit,
      category: currentTopic || '',
      user_id: user?.id,
      ...(searchQuery && { search: searchVariable })
    },
    skip: !user?.id || !currentTopic,
    fetchPolicy: 'cache-and-network',
  });

  // Combined loading, error and data states
  const loading = allArticlesLoading || categoryArticlesLoading;
  const error = allArticlesError || categoryArticlesError;
  const data = currentTopic ? categoryArticlesData : allArticlesData;
  
  const refetch = useCallback(() => {
    if (currentTopic) {
      refetchCategoryArticles();
    } else {
      refetchAllArticles();
    }
  }, [currentTopic, refetchCategoryArticles, refetchAllArticles]);
  
  // Reset page when changing topic or search
  useEffect(() => {
    setPage(0);
  }, [currentTopic, searchQuery]);
  
  const handleToggleSave = async (articleId, isSaved, savedArticleId) => {
    try {
      if (isSaved && savedArticleId) {
        await deleteSavedArticle({
          variables: { id: savedArticleId }
        });
        addToast('Article removed from saved items', 'info');
      } else {
        await saveArticle({
          variables: { 
            user_id: user.id,
            article_id: articleId
          }
        });
        addToast('Article saved successfully', 'success');
      }
      refetch();
    } catch (err) {
      console.error('Error toggling article save:', err);
      addToast('Failed to update saved status', 'error');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchTerm);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  const topics = ['Technology', 'Business', 'Science', 'Health', 'Politics'];

  if (error) {
    console.error('GraphQL error:', error);
    
    // Additional diagnostic information
    console.log('Current query variables:', {
      offset: page * limit,
      limit,
      category: currentTopic || '',
      user_id: user?.id,
      search: searchVariable
    });
    
    // Parse error message for better clarity
    let errorMessage = error.message;
    let detailedError = "";
    
    if (error.message.includes("unexpected null value for type 'String'")) {
      errorMessage = "Error processing search query";
      detailedError = "There was an issue with the search parameters. Try refreshing or using a different search term.";
    }
    
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
          <h3 className="text-lg font-medium">Error loading news feed</h3>
          <p className="mt-2">{errorMessage}</p>
          
          {detailedError && (
            <p className="mt-1 text-sm">{detailedError}</p>
          )}
          
          <div className="mt-4">
            {error.graphQLErrors?.map((err, i) => (
              <div key={i} className="text-sm text-red-700">
                {err.message}
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <button 
              onClick={refetch} 
              className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Try Again
            </button>
            
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Clear Search
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Your News Feed</h1>
          <form 
            onSubmit={handleSearch} 
            className="flex w-full sm:w-auto"
          >
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 border border-l-0 border-blue-600 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:text-sm"
            >
              Search
            </button>
          </form>
        </div>

        <div className="flex overflow-x-auto hide-scrollbar py-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentTopic(null)}
              className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                !currentTopic
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Topics
            </button>
            {topics.map((topic) => (
              <button
                key={topic}
                onClick={() => setCurrentTopic(topic)}
                className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  currentTopic === topic
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {searchQuery && (
          <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-blue-800 flex justify-between items-center">
            <div>
              Showing results for: <span className="font-medium">{searchQuery}</span>
            </div>
            <button 
              onClick={clearSearch}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear Search
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.articles && data.articles.length > 0 ? (
              data.articles.map((article) => (
                <NewsCard 
                  key={article.id} 
                  article={article} 
                  onToggleSave={handleToggleSave}
                />
              ))
            ) : (
              <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                <div className="mx-auto h-16 w-16 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 0 0-7.5-7.5H4.5m0-6.75h.75c7.87 0 14.25 6.38 14.25 14.25v.75M6 18.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No articles found</h3>
                <p className="mt-1 text-gray-500">
                  {searchQuery 
                    ? `No articles match your search "${searchQuery}"${currentTopic ? ` in the "${currentTopic}" category` : ''}.` 
                    : currentTopic 
                      ? `No articles found in the "${currentTopic}" category.` 
                      : "No articles available at this time."}
                </p>
              </div>
            )}
          </div>
        )}

        {data?.articles && data.articles.length > 0 && (
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center px-4 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page + 1}
              {data.articles.length < limit ? ' (last page)' : ''}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={data.articles.length < limit}
              className="inline-flex items-center px-4 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Next page"
            >
              Next
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
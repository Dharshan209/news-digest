import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useUserData } from '@nhost/react';
import Layout from '../components/Layout';
import NewsCard from '../components/NewsCard';
import { useToast } from '../contexts/ToastContext';

const GET_SAVED_ARTICLES = gql`
  query GetSavedArticles($user_id: uuid!, $offset: Int!, $limit: Int!, $is_read: Boolean) {
    saved_articles(
      where: { 
        user_id: { _eq: $user_id },
        is_read: { _eq: $is_read }
      }
      order_by: { saved_at: desc }
      offset: $offset
      limit: $limit
    ) {
      id
      is_read
      article {
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
      }
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

export default function SavedArticles() {
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [page, setPage] = useState(0);
  const limit = 10;
  const user = useUserData();
  const { addToast } = useToast();
  
  const [deleteSavedArticle] = useMutation(DELETE_SAVED_ARTICLE);

  const { 
    loading, 
    error, 
    data, 
    refetch 
  } = useQuery(GET_SAVED_ARTICLES, {
    variables: {
      user_id: user?.id,
      offset: page * limit,
      limit,
      is_read: filter === 'all' ? undefined : filter === 'read'
    },
    skip: !user?.id,
  });

  const handleUnsave = async (articleId, savedArticleId) => {
    try {
      await deleteSavedArticle({
        variables: { id: savedArticleId }
      });
      
      addToast('Article removed from saved items', 'success');
      refetch();
    } catch (err) {
      console.error('Error removing saved article:', err);
      addToast('Failed to remove article', 'error');
    }
  };

  // Transform the saved articles data to match the format expected by NewsCard
  const transformedArticles = data?.saved_articles.map(savedArticle => ({
    ...savedArticle.article,
    saved_articles: [{ id: savedArticle.id, is_read: savedArticle.is_read }]
  })) || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Saved Articles</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm rounded-md ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm rounded-md ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 text-sm rounded-md ${
                filter === 'read'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Read
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md">
            <p className="font-medium">Error loading saved articles</p>
            <p className="mt-1">{error.message}</p>
            <button 
              onClick={() => refetch()} 
              className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        ) : transformedArticles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <div className="mx-auto h-16 w-16 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 0 0-7.5-7.5H4.5m0-6.75h.75c7.87 0 14.25 6.38 14.25 14.25v.75M6 18.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No saved articles</h3>
            <p className="mt-1 text-gray-500">
              {filter === 'all' 
                ? "You haven't saved any articles yet." 
                : filter === 'unread' 
                  ? "You don't have any unread saved articles." 
                  : "You don't have any read saved articles."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transformedArticles.map((article) => (
              <NewsCard 
                key={article.id} 
                article={article} 
                onToggleSave={(articleId, isSaved, savedArticleId) => handleUnsave(articleId, savedArticleId)}
              />
            ))}
          </div>
        )}

        {transformedArticles.length > 0 && (
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">Page {page + 1}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={transformedArticles.length < limit}
              className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
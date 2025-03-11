import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useUserData } from '@nhost/react';
import Layout from '../components/Layout';
import { format } from 'date-fns';
import { useToast } from '../contexts/ToastContext';
import DOMPurify from 'dompurify';
import { 
  ArrowLeftIcon, 
  BookmarkIcon as BookmarkOutline, 
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  NewspaperIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';

const GET_ARTICLE = gql`
  query GetArticle($id: uuid!, $user_id: uuid!) {
    articles_by_pk(id: $id) {
      id
      title
      content
      source
      published_at
      url
      image_url
      article_summaries {
        summary
      }
      article_sentiments {
        sentiment
        score
        explanation
      }
      saved_articles(where: { user_id: { _eq: $user_id } }) {
        id
        is_read
      }
    }
  }
`;

const MARK_AS_READ = gql`
  mutation MarkAsRead($id: uuid!) {
    update_saved_articles_by_pk(
      pk_columns: { id: $id }, 
      _set: { is_read: true }
    ) {
      id
    }
  }
`;

const SAVE_ARTICLE = gql`
  mutation SaveArticle($user_id: uuid!, $article_id: uuid!) {
    insert_saved_articles_one(object: {
      user_id: $user_id, 
      article_id: $article_id,
      is_read: true
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

export default function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useUserData();
  const { addToast } = useToast();
  const [imageError, setImageError] = useState(false);
  
  const [markAsRead] = useMutation(MARK_AS_READ);
  const [saveArticle] = useMutation(SAVE_ARTICLE);
  const [deleteSavedArticle] = useMutation(DELETE_SAVED_ARTICLE);
  
  const { loading, error, data, refetch } = useQuery(GET_ARTICLE, {
    variables: { 
      id,
      user_id: user?.id 
    },
    skip: !user?.id,
    fetchPolicy: 'cache-and-network'
  });
  
  useEffect(() => {
    // Mark article as read when viewed
    if (data?.articles_by_pk?.saved_articles?.[0]?.id) {
      const savedArticleId = data.articles_by_pk.saved_articles[0].id;
      markAsRead({ variables: { id: savedArticleId } })
        .catch(err => {
          console.error('Error marking article as read:', err);
          addToast('Failed to mark article as read', 'error');
        });
    }
  }, [data, markAsRead, addToast]);

  const handleToggleSave = async (article) => {
    try {
      const savedArticle = article.saved_articles?.[0];
      const isSaved = !!savedArticle;
      
      if (isSaved && savedArticle.id) {
        await deleteSavedArticle({
          variables: { id: savedArticle.id }
        });
        addToast('Article removed from saved items', 'info');
      } else {
        await saveArticle({
          variables: { 
            user_id: user.id,
            article_id: article.id
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

  const handleImageError = () => {
    setImageError(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
            <h3 className="text-lg font-medium">Error loading article</h3>
            <p className="mt-2">{error.message}</p>
            <div className="mt-4 flex space-x-4">
              <button 
                onClick={() => refetch()} 
                className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const article = data?.articles_by_pk;
  
  if (!article) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <div className="mx-auto h-16 w-16 text-gray-400">
              <NewspaperIcon className="h-16 w-16" />
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Article not found</h3>
            <p className="mt-1 text-gray-500">
              The article you're looking for doesn't exist or may have been removed.
            </p>
            <div className="mt-6">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  const summary = article.article_summaries?.[0]?.summary || '';
  const sentiment = article.article_sentiments?.[0] || { sentiment: 'neutral', score: 0.5, explanation: '' };
  const savedArticle = article.saved_articles?.[0];
  const isSaved = !!savedArticle;
  
  // Sanitize HTML content
  const sanitizedContent = DOMPurify.sanitize(article.content, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'class', 'id']
  });

  const getSentimentColor = () => {
    switch (sentiment.sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'neutral':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
            Back
          </button>
          
          <button
            onClick={() => handleToggleSave(article)}
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isSaved 
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            aria-label={isSaved ? "Remove from saved articles" : "Save article"}
          >
            {isSaved ? (
              <>
                <BookmarkSolid className="h-4 w-4 mr-1.5" />
                Saved
              </>
            ) : (
              <>
                <BookmarkOutline className="h-4 w-4 mr-1.5" />
                Save Article
              </>
            )}
          </button>
        </div>

        <article className="bg-white rounded-lg shadow overflow-hidden">
          <header className="p-6 sm:p-8 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-3">
              <span className="font-medium">{article.source}</span>
              <span className="text-gray-300">•</span>
              <span className="flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                {format(new Date(article.published_at), 'MMMM d, yyyy')}
              </span>
              {article.url && (
                <>
                  <span className="text-gray-300">•</span>
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                    Source
                  </a>
                </>
              )}
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">{article.title}</h1>
            
            {article.image_url && !imageError ? (
              <div className="mt-6 -mx-6 sm:-mx-8">
                <img 
                  src={article.image_url} 
                  alt={article.title} 
                  className="w-full h-64 sm:h-80 object-cover"
                  onError={handleImageError}
                  loading="lazy"
                />
              </div>
            ) : null}
          </header>
          
          <div className="grid sm:grid-cols-3 gap-6 p-6 sm:p-8 bg-gray-50 border-b border-gray-200">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">AI Summary</h2>
              </div>
              <p className="text-gray-700">{summary}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">SENTIMENT ANALYSIS</h3>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border w-fit ${getSentimentColor()}`}>
                    {sentiment.sentiment} ({Math.round(sentiment.score * 100)}%)
                  </span>
                  <p className="mt-2 text-sm text-gray-600">{sentiment.explanation}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 prose prose-blue max-w-none">
            <div className="article-content" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
          </div>
          
          <div className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
              Back to articles
            </button>
            
            {article.url && (
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1.5" />
                Read at source
              </a>
            )}
          </div>
        </article>
      </div>
    </Layout>
  );
}
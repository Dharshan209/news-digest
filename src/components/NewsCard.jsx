import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { BookmarkIcon as BookmarkOutline, EyeIcon, ClockIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid, EyeIcon as EyeSolid } from '@heroicons/react/24/solid';

const SentimentBadge = memo(({ sentiment, score }) => {
  const colors = {
    positive: 'bg-green-100 text-green-800 border-green-200',
    neutral: 'bg-gray-100 text-gray-800 border-gray-200',
    negative: 'bg-red-100 text-red-800 border-red-200',
  };

  const getLabel = () => {
    const percentage = Math.round(score * 100);
    return `${sentiment} (${percentage}%)`;
  };

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors[sentiment]}`}
      title={`This article has a ${sentiment} sentiment with ${Math.round(score * 100)}% confidence`}
    >
      {getLabel()}
    </span>
  );
});

SentimentBadge.displayName = 'SentimentBadge';

const NewsCard = ({ article, onToggleSave }) => {
  const [imageError, setImageError] = useState(false);
  
  // Adapt to the schema structure
  const summary = article.article_summaries?.[0]?.summary || '';
  const sentiment = article.article_sentiments?.[0]?.sentiment || 'neutral';
  const score = article.article_sentiments?.[0]?.score || 0.5;
  const savedArticle = article.saved_articles?.[0];
  const isSaved = !!savedArticle;
  const isRead = savedArticle?.is_read || false;

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
      <div className="sm:flex">
        {article.image_url && !imageError ? (
          <div className="sm:flex-shrink-0 h-48 sm:h-auto sm:w-48">
            <img 
              src={article.image_url} 
              alt={article.title} 
              className="w-full h-full object-cover"
              onError={handleImageError}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="hidden sm:block sm:flex-shrink-0 sm:w-48 bg-gray-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </div>
        )}
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-gray-500">{article.source}</span>
                <span className="text-xs text-gray-400 flex items-center">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {format(new Date(article.published_at), 'MMM d, yyyy')}
                </span>
              </div>
              <Link to={`/article/${article.id}`} className="block group">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h3>
              </Link>
              <p className="mt-2 text-sm text-gray-600 line-clamp-2 sm:line-clamp-3">
                {summary}
              </p>
            </div>
            <div className="ml-4 flex flex-col items-end space-y-2">
              <button
                onClick={() => onToggleSave(article.id, isSaved, savedArticle?.id)}
                className={`p-2 rounded-full ${isSaved ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-50'}`}
                aria-label={isSaved ? "Remove from saved articles" : "Save article"}
              >
                {isSaved ? (
                  <BookmarkSolid className="h-5 w-5" />
                ) : (
                  <BookmarkOutline className="h-5 w-5" />
                )}
              </button>
              {isRead ? (
                <div className="text-blue-600 flex items-center text-xs font-medium">
                  <EyeSolid className="h-4 w-4 mr-1" />
                  Read
                </div>
              ) : (
                <div className="text-gray-400 flex items-center text-xs font-medium">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Unread
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-auto pt-4 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <SentimentBadge 
                sentiment={sentiment} 
                score={score} 
              />
            </div>
            <div className="flex space-x-2">
              <Link 
                to={`/article/${article.id}`} 
                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              >
                Read Article
              </Link>
              {article.url && (
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="h-3 w-3 mr-1" />
                  Source
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(NewsCard);
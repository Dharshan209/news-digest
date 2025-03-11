import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useUserData } from '@nhost/react';
import Layout from '../components/Layout';

const GET_USER_PREFERENCES = gql`
  query GetUserPreferences($user_id: uuid!) {
    user_preferences(where: { user_id: { _eq: $user_id } }) {
      id
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
`;

const UPDATE_PREFERENCES = gql`
  mutation UpdatePreferences(
    $preference_id: uuid!,
    $keywords: jsonb,
    $receive_notifications: Boolean
  ) {
    update_user_preferences_by_pk(
      pk_columns: { id: $preference_id },
      _set: {
        keywords: $keywords,
        receive_notifications: $receive_notifications,
        updated_at: "now()"
      }
    ) {
      id
    }
  }
`;

const ADD_TOPIC = gql`
  mutation AddTopic($preference_id: uuid!, $name: String!, $description: String) {
    insert_topics_one(
      object: {
        preference_id: $preference_id,
        name: $name,
        description: $description
      }
    ) {
      id
    }
  }
`;

const DELETE_TOPIC = gql`
  mutation DeleteTopic($id: uuid!) {
    delete_topics_by_pk(id: $id) {
      id
    }
  }
`;

const ADD_SOURCE = gql`
  mutation AddSource($preference_id: uuid!, $name: String!, $url: String!, $is_trusted: Boolean) {
    insert_sources_one(
      object: {
        preference_id: $preference_id,
        name: $name,
        url: $url,
        is_trusted: $is_trusted
      }
    ) {
      id
    }
  }
`;

const DELETE_SOURCE = gql`
  mutation DeleteSource($id: uuid!) {
    delete_sources_by_pk(id: $id) {
      id
    }
  }
`;

export default function Preferences() {
  const user = useUserData();
  const { loading, error, data, refetch } = useQuery(GET_USER_PREFERENCES, {
    variables: { user_id: user?.id },
    skip: !user?.id,
  });
  
  const [updatePreferences] = useMutation(UPDATE_PREFERENCES);
  const [addTopic] = useMutation(ADD_TOPIC);
  const [deleteTopic] = useMutation(DELETE_TOPIC);
  const [addSource] = useMutation(ADD_SOURCE);
  const [deleteSource] = useMutation(DELETE_SOURCE);

  const [keywords, setKeywords] = useState([]);
  const [topicName, setTopicName] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [receiveNotifications, setReceiveNotifications] = useState(false);

  const userPreference = data?.user_preferences?.[0];
  
  useEffect(() => {
    if (userPreference) {
      setKeywords(userPreference.keywords || []);
      setReceiveNotifications(userPreference.receive_notifications || false);
    }
  }, [userPreference]);

  const availableTopics = [
    'Technology',
    'Business',
    'Science',
    'Health',
    'Politics',
    'Entertainment',
    'Sports'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userPreference?.id) return;
    
    try {
      await updatePreferences({
        variables: {
          preference_id: userPreference.id,
          keywords,
          receive_notifications: receiveNotifications,
        },
      });
      await refetch();
    } catch (err) {
      console.error('Error updating preferences:', err);
    }
  };
  
  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!topicName || !userPreference?.id) return;
    
    try {
      await addTopic({
        variables: {
          preference_id: userPreference.id,
          name: topicName,
          description: `User interest in ${topicName}`,
        },
      });
      setTopicName('');
      await refetch();
    } catch (err) {
      console.error('Error adding topic:', err);
    }
  };
  
  const handleDeleteTopic = async (topicId) => {
    try {
      await deleteTopic({
        variables: { id: topicId },
      });
      await refetch();
    } catch (err) {
      console.error('Error deleting topic:', err);
    }
  };
  
  const handleAddSource = async (e) => {
    e.preventDefault();
    if (!sourceName || !sourceUrl || !userPreference?.id) return;
    
    try {
      await addSource({
        variables: {
          preference_id: userPreference.id,
          name: sourceName,
          url: sourceUrl,
          is_trusted: true,
        },
      });
      setSourceName('');
      setSourceUrl('');
      await refetch();
    } catch (err) {
      console.error('Error adding source:', err);
    }
  };
  
  const handleDeleteSource = async (sourceId) => {
    try {
      await deleteSource({
        variables: { id: sourceId },
      });
      await refetch();
    } catch (err) {
      console.error('Error deleting source:', err);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-red-600">Error loading preferences: {error.message}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">News Preferences</h1>

        {!userPreference ? (
          <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 text-yellow-800">
            No preferences found. Please contact support to set up your account.
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Topics of Interest</h2>
              <div className="space-y-4">
                <form onSubmit={handleAddTopic} className="flex gap-2">
                  <input
                    type="text"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    placeholder="Add a new topic"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </form>
                
                <div className="bg-white rounded-md shadow overflow-hidden">
                  {userPreference.topics?.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {userPreference.topics.map((topic) => (
                        <li key={topic.id} className="flex items-center justify-between p-4">
                          <div>
                            <span className="font-medium">{topic.name}</span>
                            {topic.description && (
                              <p className="text-sm text-gray-500">{topic.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteTopic(topic.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-4 text-gray-500">No topics added yet. Add a topic to receive relevant news.</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">News Sources</h2>
              <div className="space-y-4">
                <form onSubmit={handleAddSource} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder="Source name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="url"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="Source URL"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Source
                  </button>
                </form>
                
                <div className="bg-white rounded-md shadow overflow-hidden">
                  {userPreference.sources?.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {userPreference.sources.map((source) => (
                        <li key={source.id} className="flex items-center justify-between p-4">
                          <div>
                            <span className="font-medium">{source.name}</span>
                            <p className="text-sm text-gray-500">{source.url}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteSource(source.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-4 text-gray-500">No sources added yet. Add trusted sources to customize your feed.</p>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Keywords</h2>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Add keywords (press Enter)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = e.target.value.trim();
                        if (value && !keywords.includes(value)) {
                          setKeywords([...keywords, value]);
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => setKeywords(keywords.filter((_, i) => i !== index))}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Notifications</h2>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={receiveNotifications}
                    onChange={(e) => setReceiveNotifications(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">Receive notifications for new articles</span>
                </label>
              </div>

              <div className="pt-5">
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
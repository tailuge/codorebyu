import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { ChatOpenAI } from '@langchain/openai';
import { CogIcon, XMarkIcon, ChevronRightIcon, ChevronDownIcon, DocumentTextIcon, FolderIcon } from '@heroicons/react/24/outline';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

import './App.css';

// Custom FileTree component
const FileTree = ({ data, onFileSelect }) => {
  const [expandedFolders, setExpandedFolders] = useState({});

  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const renderTree = (node, path = '') => {
    const currentPath = path ? `${path}/${node.name}` : node.name;

    if (node.isLeaf) {
      return (
        <div
          key={currentPath}
          className="pl-6 py-1 flex items-center hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition duration-150 ease-in-out"
          onClick={() => onFileSelect(node)}
        >
          <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-500" />
          <span className="text-sm truncate">{node.name}</span>
        </div>
      );
    }

    const isExpanded = expandedFolders[currentPath] !== false; // Default to expanded

    return (
      <div key={currentPath}>
        <div
          className="py-1 flex items-center hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition duration-150 ease-in-out"
          onClick={() => toggleFolder(currentPath)}
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 mr-1" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 mr-1" />
          )}
          <FolderIcon className="h-4 w-4 mr-2 text-yellow-500" />
          <span className="text-sm font-medium">{node.name}</span>
        </div>

        {isExpanded && (
          <div className="ml-4">
            {node.children && node.children.map(child => renderTree(child, currentPath))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-tree">
      {data.children && data.children.map(child => renderTree(child))}
    </div>
  );
};

function App() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/tailuge/codorebyu');
  const [folderStructure, setFolderStructure] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [codeReview, setCodeReview] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    localStorage.getItem('systemPrompt') ||
    'You are a helpful code reviewer. Provide a concise code review with just one or two key points for improvement.'
  );
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract owner and repo from GitHub URL
  const parseGitHubUrl = (url) => {
    try {
      const regex = /github\.com\/([^/]+)\/([^/]+)/;
      const match = url.match(regex);
      if (match) {
        return { owner: match[1], repo: match[2].replace('.git', '') };
      }
      throw new Error('Invalid GitHub URL');
    } catch (error) {
      setError('Invalid GitHub URL format');
      return null;
    }
  };

  // Fetch repository structure
  const fetchRepoStructure = async () => {
    setError('');
    setLoading(true);

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setLoading(false);
      return;
    }

    try {
      const { owner, repo } = parsed;
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`);

      if (response.data && response.data.tree) {
        const tree = response.data.tree;
        const structure = buildFolderStructure(tree);
        setFolderStructure(structure);
      } else {
        throw new Error('Failed to fetch repository structure');
      }
    } catch (error) {
      console.error('Error fetching repo structure:', error);
      setError(error.response?.data?.message || 'Failed to fetch repository structure. Try the "master" branch if "main" doesn\'t exist.');

      // Try with master branch if main fails
      if (error.response?.status === 404) {
        try {
          const { owner, repo } = parseGitHubUrl(repoUrl);
          const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`);

          if (response.data && response.data.tree) {
            const tree = response.data.tree;
            const structure = buildFolderStructure(tree);
            setFolderStructure(structure);
            setError('');
          }
        } catch (retryError) {
          setError('Failed to fetch repository structure from both main and master branches.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Build folder structure for the file tree
  const buildFolderStructure = (tree) => {
    const root = { name: 'root', children: [], isOpen: true };
    const pathMap = { '': root };

    tree.forEach(item => {
      if (item.type === 'blob' || item.type === 'tree') {
        const pathParts = item.path.split('/');
        const fileName = pathParts.pop();
        const parentPath = pathParts.join('/');

        let parent = pathMap[parentPath];
        if (!parent) {
          // Create parent folders if they don't exist
          let currentPath = '';
          for (const part of pathParts) {
            const prevPath = currentPath;
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!pathMap[currentPath]) {
              const newFolder = {
                name: part,
                children: [],
                isOpen: true,
                path: currentPath
              };
              pathMap[prevPath].children.push(newFolder);
              pathMap[currentPath] = newFolder;
            }
          }
          parent = pathMap[parentPath];
        }

        if (item.type === 'blob') {
          parent.children.push({
            name: fileName,
            path: item.path,
            url: item.url,
            isLeaf: true
          });
        } else if (item.type === 'tree') {
          const folder = {
            name: fileName,
            children: [],
            isOpen: true,
            path: item.path
          };
          parent.children.push(folder);
          pathMap[item.path] = folder;
        }
      }
    });

    return root;
  };

  // Handle file selection in the tree
  const handleFileSelect = async (node) => {
    setSelectedFile(node);
    setLoading(true);
    setError('');

    try {
      const { owner, repo } = parseGitHubUrl(repoUrl);
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${node.path}`);

      if (response.data && response.data.content) {
        const content = atob(response.data.content);
        setFileContent(content);
      } else {
        throw new Error('Failed to fetch file content');
      }
    } catch (error) {
      console.error('Error fetching file content:', error);
      setError('Failed to fetch file content');
      setFileContent('');
    } finally {
      setLoading(false);
    }
  };

  // Get file extension for syntax highlighting
  const getFileExtension = (filename) => {
    return filename.split('.').pop();
  };

  // Request code review from LLM
  const requestCodeReview = async () => {
    if (!fileContent || !apiKey) {
      setError(apiKey ? 'No file selected' : 'API Key is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Direct API call to Azure OpenAI
      const response = await axios.post(
        'https://models.inference.ai.azure.com/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Review this code:\n\`\`\`${getFileExtension(selectedFile.name)}\n${fileContent}\n\`\`\`` }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey
          }
        }
      );

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        setCodeReview(response.data.choices[0].message.content);
        setShowReview(true);
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error) {
      console.error('Error getting code review:', error);
      setError('Failed to get code review. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save settings to localStorage
  const saveSystemPrompt = () => {
    localStorage.setItem('systemPrompt', systemPrompt);
  };

  const saveApiKey = () => {
    localStorage.setItem('apiKey', apiKey);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">
            <a href="https://github.com/tailuge/codorebyu" target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2">
              <FontAwesomeIcon icon={faGithub} className="h-6 w-6" />
              Code Review App
            </a>
          </h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full hover:bg-indigo-700 transition-colors"
          >
            <CogIcon className="h-6 w-6 animate-spin-slow" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto flex-1 p-4 flex flex-col">
        {/* Repository URL input */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="Enter GitHub repository URL (e.g., https://github.com/owner/repo)"
            className="flex-1 p-3 border rounded-md dark:bg-gray-800 dark:text-white dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={fetchRepoStructure}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 transition duration-200 ease-in-out"
          >
            {loading ? 'Loading...' : 'Fetch'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Folder tree */}
          <div className="w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 overflow-auto">
            <h2 className="text-lg font-semibold mb-3 dark:text-white">Repository Structure</h2>
            {folderStructure ? (
              <FileTree
                data={folderStructure}
                onFileSelect={handleFileSelect}
              />
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Enter a GitHub repository URL and click "Fetch" to view the structure
              </p>
            )}
          </div>

          {/* Code viewer */}
          <div className="w-2/3 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold dark:text-white">
                {selectedFile ? selectedFile.path : 'Code Viewer'}
              </h2>
              {selectedFile && (
                <button
                  onClick={requestCodeReview}
                  disabled={loading || !apiKey}
                  className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 transition duration-200 ease-in-out"
                >
                  {loading ? 'Processing...' : 'Review Code'}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto">
              {selectedFile ? (
                <SyntaxHighlighter
                  language={getFileExtension(selectedFile.name)}
                  style={vscDarkPlus}
                  showLineNumbers
                  customStyle={{ margin: 0, minHeight: '100%' }}
                >
                  {fileContent}
                </SyntaxHighlighter>
              ) : (
                <div className="p-4 text-gray-500 dark:text-gray-400">
                  Select a file from the repository to view its content
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Code Review Modal */}
      {showReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white">Code Review</h2>
              <button
                onClick={() => setShowReview(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <ReactMarkdown
                className="prose dark:prose-invert max-w-none"
                remarkPlugins={[remarkGfm]}
              >
                {codeReview}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-800 shadow-xl transform ${showSettings ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out z-40`}>
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold dark:text-white">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full p-3 border rounded-md h-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter system prompt for the LLM"
            />
            <button
              onClick={saveSystemPrompt}
              className="mt-3 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 w-full transition duration-200 ease-in-out"
            >
              Save Prompt
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your API key"
            />
            <button
              onClick={saveApiKey}
              className="mt-3 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 w-full transition duration-200 ease-in-out"
            >
              Save API Key
            </button>
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Get GitHub token
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

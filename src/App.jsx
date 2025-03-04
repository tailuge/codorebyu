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
          className="file-item"
          onClick={() => onFileSelect(node)}
        >
          <DocumentTextIcon className="icon" />
          <span className="file-name">{node.name}</span>
        </div>
      );
    }

    const isExpanded = expandedFolders[currentPath] !== false; // Default to expanded

    return (
      <div key={currentPath} className="folder">
        <div
          className="folder-header"
          onClick={() => toggleFolder(currentPath)}
        >
          {isExpanded ? (
            <ChevronDownIcon className="icon" />
          ) : (
            <ChevronRightIcon className="icon" />
          )}
          <FolderIcon className="icon folder-icon" />
          <span className="folder-name">{node.name}</span>
        </div>

        {isExpanded && (
          <div className="folder-content">
            {node.children && node.children.map(child => renderTree(child, currentPath))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-tree">{data.children && data.children.map(child => renderTree(child))}</div>
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
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <a href="https://github.com/tailuge/codorebyu" target="_blank" rel="noopener noreferrer" className="logo-link">
            <FontAwesomeIcon icon={faGithub} className="github-icon" />
            <span className="app-title">Code Review App</span>
          </a>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="settings-button"
          >
            <CogIcon className="cog-icon" />
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="input-section">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="Enter GitHub repository URL"
            className="repo-input"
          />
          <button
            onClick={fetchRepoStructure}
            disabled={loading}
            className="fetch-button"
          >
            {loading ? 'Loading...' : 'Fetch'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="content-area">
          <div className="file-tree-container">
            <h2 className="file-tree-title">Repository Structure</h2>
            {folderStructure ? (
              <FileTree
                data={folderStructure}
                onFileSelect={handleFileSelect}
              />
            ) : (
              <p className="empty-message">
                Enter a GitHub repository URL and click "Fetch"
              </p>
            )}
          </div>

          <div className="code-viewer-container">
            <div className="code-viewer-header">
              <h2 className="code-viewer-title">
                {selectedFile ? selectedFile.path : 'Code Viewer'}
              </h2>
              {selectedFile && (
                <button
                  onClick={requestCodeReview}
                  disabled={loading || !apiKey}
                  className="review-button"
                >
                  {loading ? 'Processing...' : 'Review Code'}
                </button>
              )}
            </div>
            <div className="code-viewer">
              {selectedFile ? (
                <SyntaxHighlighter
                  language={getFileExtension(selectedFile.name)}
                  style={vscDarkPlus}
                  showLineNumbers
                >
                  {fileContent}
                </SyntaxHighlighter>
              ) : (
                <div className="empty-message">
                  Select a file to view its content
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Code Review Modal */}
      {showReview && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Code Review</h2>
              <button
                onClick={() => setShowReview(false)}
                className="close-button"
              >
                <XMarkIcon className="close-icon" />
              </button>
            </div>
            <div className="modal-content">
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
      <div className={`settings-panel ${showSettings ? 'open' : ''}`}>
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="close-button"
          >
            <XMarkIcon className="close-icon" />
          </button>
        </div>
        <div className="settings-content">
          <div className="setting-group">
            <label className="setting-label">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="setting-textarea"
              placeholder="Enter system prompt"
            />
            <button
              onClick={saveSystemPrompt}
              className="save-button"
            >
              Save Prompt
            </button>
          </div>
          <div className="setting-group">
            <label className="setting-label">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="setting-input"
              placeholder="Enter your API key"
            />
            <button
              onClick={saveApiKey}
              className="save-button"
            >
              Save API Key
            </button>
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="get-token-link"
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

const DEFAULT_REPO = "https://github.com/tailuge/codorebyu"

// Add these CSS classes to your stylesheet
/*
.tree-node {
  padding: 4px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-radius: 4px;
}

.tree-node:hover {
  background-color: #f5f5f5;
}

.tree-node.selected {
  background-color: #e0e0e0;
}

.tree-icon {
  width: 18px;
  height: 18px;
  margin-right: 8px;
  flex-shrink: 0;
}

.tree-label {
  font-family: 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #333;
}

.children {
  margin-left: 20px;
  border-left: 1px solid #eee;
  padding-left: 12px;
}

.directory {
  font-weight: 600;
  color: #1a73e8;
}

.dotfile {
  color: #666;
  opacity: 0.8;
}
*/

async function fetchRepoTree() {
  const repoUrl = document.getElementById("repoUrl").value || DEFAULT_REPO
  const apiUrl = repoUrl.replace(
    "https://github.com/",
    "https://api.github.com/repos/"
  )
  const treeContainer = document.getElementById("treeContainer")
  const fileViewer = document.getElementById("fileViewer")

  treeContainer.innerHTML = '<div class="loading">Loading repository structure...</div>'
  fileViewer.value = ""

  try {
    const repoResponse = await fetch(`${apiUrl}/git/trees/main?recursive=1`)
    if (!repoResponse.ok) throw new Error("Failed to fetch repository data")

    const repoData = await repoResponse.json()
    const tree = buildTree(repoData.tree)
    treeContainer.innerHTML = ""
    renderTree(tree, treeContainer, apiUrl)
  } catch (error) {
    console.error("Error:", error)
    alert("Unable to fetch repository. Please check the URL.")
  }
}

function buildTree(files) {
  const tree = {}

  // Sort files before processing
  files.sort((a, b) => {
    const aIsDir = a.type === 'tree'
    const bIsDir = b.type === 'tree'
    const aIsDotfile = a.path.startsWith('.')
    const bIsDotfile = b.path.startsWith('.')
    
    if (aIsDir && !bIsDir) return -1
    if (!aIsDir && bIsDir) return 1
    if (aIsDotfile && !bIsDotfile) return 1
    if (!aIsDotfile && bIsDotfile) return -1
    return a.path.localeCompare(b.path)
  })

  files.forEach((file) => {
    const parts = file.path.split("/")
    let currentLevel = tree

    parts.forEach((part, index) => {
      if (!currentLevel[part]) {
        currentLevel[part] = {
          ...file,
          children: {},
          name: part,
          isDirectory: index < parts.length - 1 || file.type === 'tree'
        }
      }
      currentLevel = currentLevel[part].children
    })
  })

  return tree
}

function renderTree(tree, container, apiUrl) {
  const ul = document.createElement("ul");
  ul.style.listStyleType = "none";
  ul.style.paddingLeft = "0";
  ul.style.margin = "0";

  // Sort items: directories first, then files (dotfiles last)
  const sortedNodes = Object.values(tree).sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    if (a.name.startsWith('.') && !b.name.startsWith('.')) return 1;
    if (!a.name.startsWith('.') && b.name.startsWith('.')) return -1;
    return a.name.localeCompare(b.name);
  });

  sortedNodes.forEach(node => {
    if (!node.path) return;

    const li = document.createElement("li");
    li.className = "tree-node";

    const labelContainer = document.createElement("div");
    labelContainer.className = "label-container";

    // Chevron for directories
    const chevron = document.createElement("span");
    chevron.className = "tree-chevron";
    chevron.textContent = node.isDirectory ? "▸" : " ";
    chevron.style.marginRight = "4px";

    // File/folder icon
    const icon = document.createElement("span");
    icon.className = "tree-icon";
    icon.textContent = node.isDirectory ? "📁" : "📄";
    icon.style.marginRight = "4px";

    const label = document.createElement("span");
    label.className = `tree-label ${node.isDirectory ? 'directory' : ''} ${node.name.startsWith('.') ? 'dotfile' : ''}`;
    label.textContent = node.name;

    labelContainer.appendChild(chevron);
    labelContainer.appendChild(icon);
    labelContainer.appendChild(label);

    if (node.isDirectory) {
      const childrenContainer = document.createElement("div");
      childrenContainer.className = "children";
      
      labelContainer.addEventListener("click", function (event) {
        event.stopPropagation();
        const wasVisible = childrenContainer.style.display === "block";
        childrenContainer.style.display = wasVisible ? "none" : "block";
        chevron.textContent = wasVisible ? "▸" : "▾";
        
        if (!wasVisible && childrenContainer.children.length === 0) {
          renderTree(node.children, childrenContainer, apiUrl);
        }
      });

      li.appendChild(labelContainer);
      li.appendChild(childrenContainer);
    } else {
      labelContainer.addEventListener("click", function () {
        document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('selected'));
        li.classList.add('selected');
        fetchFileContent(apiUrl, node.path);
      });
      li.appendChild(labelContainer);
    }

    ul.appendChild(li);
  });

  container.appendChild(ul);
}

async function fetchFileContent(apiUrl, filePath) {
  const fileViewer = document.getElementById("fileViewer")
  const reviewOutput = document.getElementById("review-output")

  // Clear review output when fetching new file content
  reviewOutput.innerHTML = ""
  // make apply button hidden
  const applyButton = document.getElementById("apply-button")
  if (applyButton) {
    applyButton.classList.add("hidden")
  }

  try {
    const fileResponse = await fetch(`${apiUrl}/contents/${filePath}`)
    if (!fileResponse.ok) throw new Error("Failed to fetch file content")

    const fileData = await fileResponse.json()
    const content = atob(fileData.content)
    fileViewer.value = content
  } catch (error) {
    console.error("Error:", error)
    alert("Unable to fetch file content.")
  }
}

// Load default repo on page load
window.onload = fetchRepoTree

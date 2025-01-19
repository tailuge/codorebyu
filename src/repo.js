const DEFAULT_REPO = "https://github.com/tailuge/codorebyu"

async function fetchRepoTree() {
  const repoUrl = document.getElementById("repoUrl").value || DEFAULT_REPO
  const apiUrl = repoUrl.replace(
    "https://github.com/",
    "https://api.github.com/repos/"
  )
  const treeContainer = document.getElementById("treeContainer")
  const fileViewer = document.getElementById("fileViewer")

  treeContainer.innerHTML = "Loading..."
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

  files.forEach((file) => {
    const parts = file.path.split("/")
    let currentLevel = tree

    parts.forEach((part, index) => {
      if (!currentLevel[part]) {
        currentLevel[part] =
          index === parts.length - 1 ? file : { _isDir: true }
      }
      currentLevel = currentLevel[part]
    })
  })

  return tree
}

function renderTree(tree, container, apiUrl) {
  const ul = document.createElement("ul")

  for (const key in tree) {
    if (key === "_isDir") continue // Skip internal marker

    // Skip if tree[key]?.path is undefined (metadata like mode, type, sha, etc.)
    if (!tree[key]?.path) continue

    const li = document.createElement("li")

    // Container for the label (icon + text)
    const labelContainer = document.createElement("div")
    labelContainer.className = "label-container"

    const icon = document.createElement("span")
    icon.className = "icon"
    icon.textContent = tree[key].type === "blob" ? "📄" : "📁"

    const label = document.createElement("span")
    label.textContent = key

    labelContainer.appendChild(icon)
    labelContainer.appendChild(label)

    li.appendChild(labelContainer)

    if (tree[key].type === "blob") {
      label.addEventListener("click", () =>
        fetchFileContent(apiUrl, tree[key].path)
      )
    } else {
      label.addEventListener("click", function (event) {
        event.stopPropagation()
        if (li.children.length > 1) {
          // Remove the children container if it exists
          li.removeChild(li.lastChild)
        } else {
          // Create a container for children and render the subtree
          const childrenContainer = document.createElement("div")
          childrenContainer.className = "children"
          renderTree(tree[key], childrenContainer, apiUrl)
          li.appendChild(childrenContainer)
        }
      })
    }

    ul.appendChild(li)
  }

  container.appendChild(ul)
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

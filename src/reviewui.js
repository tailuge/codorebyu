import { submitCodeReview } from "./google"

const reviewOutput = document.querySelector("#review-output")
const codeReviewButton = document.getElementById("review-button")
const applyButton = document.getElementById("apply-button")
const apiKeyInput = document.getElementById("apiKey")

// Initialize button
codeReviewButton.id = "review-button"
codeReviewButton.textContent = "Review"

// Handle button click for code review
codeReviewButton.addEventListener("click", () => {
  const sourceCodeTextArea = document.getElementById("fileViewer")
  const sourceCode = sourceCodeTextArea.value
  const prompt =
    "Review the following code with respect to best practices and readability. The response should be succinct and focus on one or at most two key issues to resolve. If the code is already good just say the code is fine with no changes required. We are looking for concise code that is clean maintainable and easy to read with nice structure and follows best practices. Be brutal and forthright to save time. Here is the code:"
  submitCodeReview(
    sourceCode,
    prompt,
    apiKeyInput.value,
    reviewOutput,
    applyButton
  )
})

// Load and save API key
const storedApiKey = localStorage.getItem("apiKey")
if (storedApiKey) {
  apiKeyInput.value = storedApiKey
}

apiKeyInput.addEventListener("input", () => {
  localStorage.setItem("apiKey", apiKeyInput.value)
})

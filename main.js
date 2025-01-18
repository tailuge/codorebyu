import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import MarkdownIt from 'markdown-it';
import './style.css';
import { API_KEY } from './keys.js';

const reviewOutput = document.querySelector('#review-output');
const codeReviewButton = document.getElementById("review-button");
const applyButton = document.getElementById('apply-button');

if (codeReviewButton) {
  codeReviewButton.id = "review-button";
  codeReviewButton.textContent = "Review"; 
  codeReviewButton.addEventListener("click", () => {
    console.log("Review button clicked");
    const sourceCodeTextArea = document.getElementById('fileViewer');
    if (sourceCodeTextArea) {
      const sourceCode = sourceCodeTextArea.value;
      const prompt = "Review the following code with respect to best practices and readability. The response should be succinct and focus on one or at most two key issues to resolve. If the code is already good just say the code is fine with no changes required. We are looking for concise code that is clean maintainable and easy to read with nice structure and follows best practices. Be brutal and forthright to save time. Here is the code:";
      submitCodeReview(sourceCode, prompt);
    } else {
      console.error("sourceCodeTextArea not found");
    }
  });
} else {
  console.error("codeReviewButton not found");
}

async function generateReview(code, prompt) {
  try {
      //set the reviewOutput to an empty string
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",

          safetySettings: [
              {
                  category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                  threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
              },
          ],
      });

      //this block of code is now updated to use the generate content stream which is more optimized 
      const result = await model.generateContentStream({ contents: [{ role: "user", parts: [{ text: prompt + code }] }] });
      let buffer = [];
      let md = new MarkdownIt();
      for await (let response of result.  stream) {
          buffer.push(response.text());
          reviewOutput.innerHTML = md.render(buffer.join(""));
      }
  } catch (e) {
      throw new Error(e);
  }
}

async function submitCodeReview(code, prompt) {
  try {
    if (reviewOutput) {
      reviewOutput.innerHTML = "Reviewing..";
    } 
    //set the reviewOutput to an empty string
    await generateReview(code,prompt)
    if (reviewOutput.innerHTML.trim() !== '') {
        if (applyButton){
            applyButton.classList.remove('hidden');
        }
    }
  } catch (err) {
    reviewOutput.innerHTML = "<hr>Error in submitting review: " + err;
  }
}


import {
    GoogleGenerativeAI,
    HarmBlockThreshold,
    HarmCategory,
  } from "@google/generative-ai";
  import MarkdownIt from "markdown-it";
  
  export async function* generateReview(apiKey, code, prompt) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });
  
      const result = await model.generateContentStream({
        contents: [{ role: "user", parts: [{ text: prompt + code }] }],
      });
  
      let buffer = [];
      let md = new MarkdownIt();
      for await (let response of result.stream) {
        buffer.push(response.text());
        // Return rendered Markdown content
        yield md.render(buffer.join(""));
      }
    } catch (e) {
      throw new Error(e);
    }
  }
  
  export async function submitCodeReview(code, prompt, apiKey, reviewOutput, applyButton) {
    try {
      if (reviewOutput) {
        reviewOutput.innerHTML = "Reviewing..";
      }
  
      const contentStream = generateReview(apiKey, code, prompt);
      for await (const renderedContent of contentStream) {
        reviewOutput.innerHTML = renderedContent;
      }
  
      if (reviewOutput.innerHTML.trim() !== "") {
        if (applyButton) {
          applyButton.classList.remove("hidden");
        }
      }
    } catch (err) {
      if (reviewOutput) {
        reviewOutput.innerHTML = "<hr>Error in submitting review: " + err.message;
      }
    }
  }
  
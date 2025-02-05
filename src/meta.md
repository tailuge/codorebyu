Create a single, self-contained HTML page for evaluating job applicants against a set of criteria. The page should have the following features:

1.  **API Key Input:** A password input field for the user to enter their Azure OpenAI API key.  This key should be saved to the browser's `localStorage` when a "Save API Key" button is clicked.  Display an error message if the key is not entered.

2.  **Main Content Area (Initially Hidden):**  A main content area that is only visible if the API key is present in `localStorage`.  This area should contain:

    *   **Criteria and Applicant Data Input:** Two textareas, displayed *side-by-side* using flexbox, for the user to enter the evaluation criteria and applicant data in JSON format.  Pre-populate these textareas with default JSON (example below), and pretty-print any entered JSON. Store these in localStorage, updating them when the evaluation button is clicked.

        *Default Criteria (Pretty-Printed):*
        ```json
        [
          {
            "title": "Age Range",
            "detail": "Applicant must be between 25 and 45 years old.",
            "field": "age"
          },
          {
            "title": "Minimum Income",
            "detail": "Applicant must have an annual income of at least $75,000.",
            "field": "income"
          },
          {
            "title": "Nationality",
            "detail": "Applicant must be a citizen of either the United States or Canada.",
            "field": "nationality"
          },
          {
            "title": "Education",
            "detail": "Applicant must have at least a Bachelor's degree.",
            "field": "education"
          },
          {
            "title": "Experience",
            "detail": "Applicant must have a minimum of 8 years related work experience.",
            "field": "experience"
          }
        ]
        ```

        *Default Applicant Data (Pretty-Printed):*
        ```json
        {
          "name": "John Doe",
          "age": 30,
          "income": 60000,
          "nationality": "United States",
          "education": "Master's Degree in Computer Science",
          "experience": "5 years of software development experience"
        }
        ```

    *   **Evaluate Button:** A button labeled "Evaluate Applicant" that triggers the evaluation process.

    *   **Report Output:**  A `<pre>` element to display the evaluation report in JSON format (pretty-printed).

3.  **Evaluation Logic (JavaScript):**

    *   Use LangChain.js to interact with the Azure OpenAI GPT-4o model.  Assume the user has set the necessary environment variables (AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT_NAME) for LangChain. Do not use the `fetch` API.
    *   The JavaScript should:
        *   Retrieve the API key from `localStorage`.
        *   Retrieve the criteria and applicant data from the textareas, parsing them as JSON.  Handle JSON parsing errors gracefully.
        *   For each criterion, construct a prompt for the LLM:
            ```
            You are an evaluator assessing an applicant against specific criteria.

            Criteria Title: [Criteria Title]
            Criteria Detail: [Criteria Detail]

            Applicant Information:
            [Applicant Data (formatted as key: value pairs)]

            Based on the provided criteria and applicant information, evaluate the applicant's status for this specific criterion.
            Return ONLY one of the following: "PASS" or "FAIL". If there is not information to base a judgement on use "NA". Follow this with a colon (:) and then provide a ONE SENTENCE justification for your decision. Do not provide any additional explanation beyond one sentence.
            ```
        *   Call the Azure OpenAI GPT-4o model via LangChain, using a temperature of 0.0 and an appropriate `max_tokens` value.
        *   Parse the LLM's response, expecting a "PASS" or "FAIL" followed by a colon and a one-sentence justification. Validate the response format and decision. Handle errors and unexpected responses.
        *   Generate a JSON report (pretty-printed) containing the evaluation results for each criterion (title, detail, evaluation, justification).  Display this report in the `<pre>` element.
        *   Handle any errors (API errors, JSON parsing errors, invalid LLM responses) gracefully, displaying appropriate error messages to the user.

4. **Styling (CSS):** Include basic CSS for readability:  reasonable font, spacing, input field widths, button styling, and error message coloring. Use flexbox for the side-by-side textareas.

5. **Functionality:** The page should be fully functional and self-contained, requiring no external files or servers (beyond the Azure OpenAI service). The page should load and be ready to have the API key entered.
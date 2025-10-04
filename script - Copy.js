/**
 * -------------------------------------------------------------------------
 * AscendEd Roadmap Generator Script (V2 - Robust)
 * -------------------------------------------------------------------------
 * This script handles the client-side logic for the roadmap generator page.
 * It features improved error handling and a better Markdown-to-HTML converter.
 */

// Wait for the entire HTML document to be fully loaded and ready.
document.addEventListener('DOMContentLoaded', () => {

    // Find the form and the output container elements in the HTML.
    const form = document.querySelector('form');
    const outputContainer = document.getElementById('roadmap-output');

    // This script should only run on the roadmap page. We check if the form exists.
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent page reload

            // Show a loading message and make the container visible
            outputContainer.innerHTML = '<div class="loading-message">Generating your personalized roadmap... This may take a moment.</div>';
            outputContainer.style.display = 'block';

            // --- 1. GATHER USER INPUT ---
            const semester = document.getElementById('semester').value;
            const branchElement = document.getElementById('branch');
            const branch = branchElement.options[branchElement.selectedIndex].text;
            const skills = document.getElementById('skills').value;

            // --- 2. CONSTRUCT THE AI PROMPT ---
            const userQuery = `
                Act as an expert career counselor for engineering students in India.
                Your task is to create a concise, scannable, and visually engaging action plan for a student with this profile:

                - **Current Semester:** ${semester}
                - **Engineering Branch:** ${branch}
                - **Existing Skills:** ${skills || 'Just getting started!'}

                **Instructions for the Action Plan:**
                - Focus **only on the student's current semester and the immediate upcoming semester**. If they are in Semester 8, just cover that semester.
                - For each semester, provide a bulleted list of the most important actions.
                - Keep each bullet point short, direct, and to the point.
                
                **Formatting Requirements:**
                - Use Markdown for the entire response.
                - Use a main heading for each semester (e.g., "### Semester ${semester}: Key Focus Areas").
                - **Crucially, start each bullet point with an emoji to categorize the advice:**
                    - 💻 for a **Technical Skill** to learn.
                    - 🤝 for a **Soft Skill** to develop.
                    - 💡 for a **Project Idea**.
                    - 🚀 for **Career/Internship Prep**.
                - Maintain an encouraging and clear tone.

                **Example for a single bullet point:**
                * 💻 Master Python basics (focus on loops & data structures) via NPTEL's Joy of Computing course.
            
            `;

            // --- 3. CALL THE API WITH IMPROVED ERROR HANDLING ---
            try {
                const roadmapText = await generateContent(userQuery);
                const formattedHtml = markdownToHtml(roadmapText);
                outputContainer.innerHTML = `<div class="roadmap-result">${formattedHtml}</div>`;
            } catch (error) {
                console.error("Error generating roadmap:", error);
                // Display the specific error message from our robust checks
                outputContainer.innerHTML = `<div class="error-message">Sorry, we couldn't generate your roadmap. <br><strong>Reason:</strong> ${error.message}</div>`;
            }
        });
    }

    /**
     * Makes a robust client-side API call to the Gemini model.
     * @param {string} prompt - The detailed prompt to send to the model.
     * @returns {Promise<string>} - The generated text from the model.
     */
    async function generateContent(prompt) {
        const apiKey = "AIzaSyBAKWP6gcsgV5BFQa8ol--3cqFwfuXvQvk";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`The server responded with an error (Status: ${response.status}).`);
        }

        const result = await response.json();

        // **CRITICAL CHECK**: Ensure the response has the expected structure.
        if (!result.candidates || result.candidates.length === 0 || !result.candidates[0].content?.parts?.[0]?.text) {
            // Check if the reason for no content is safety filters
            if (result.candidates?.[0]?.finishReason === 'SAFETY') {
                throw new Error("The response was blocked for safety reasons. Please try rephrasing your skills or query.");
            }
            // Otherwise, it's an unexpected response from the API
            throw new Error("The API returned an empty or invalid response. Please try again.");
        }

        return result.candidates[0].content.parts[0].text;
    }

    /**
     * A more robust function to convert Markdown to HTML.
     * It correctly handles lists, headings, and bold text.
     * @param {string} md - The text with Markdown formatting.
     * @returns {string} - HTML formatted text.
     */
    function markdownToHtml(md) {
        let html = '';
        const lines = md.split('\n');
        let inList = false;

        for (const line of lines) {
            // Headings
            if (line.startsWith('### ')) {
                if (inList) { html += '</ul>'; inList = false; }
                html += `<h3>${line.substring(4)}</h3>`;
            }
            // List items
            else if (line.startsWith('* ')) {
                if (!inList) { html += '<ul>'; inList = true; }
                // Process bold text inside list items
                const listItem = line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                html += `<li>${listItem}</li>`;
            }
            // End of a list
            else {
                if (inList) { html += '</ul>'; inList = false; }
                // Process bold text in regular paragraphs
                html += `<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
            }
        }
        if (inList) { html += '</ul>'; } // Close any open list at the end
        return html;
    }
});


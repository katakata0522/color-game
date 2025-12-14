# AGENTS.md - Instructions for Jules & AI Agents

## 1. Project Overview
This repository is an experimental project by **katakata0522**.
The goal is to create **high-quality, robust, and monetizeable** applications.

## 2. Critical Rules (Strictly Prohibited)
*   **NEVER change the text content:**
    *   Do NOT change, summarize, or omit any text, labels, messages, or article content.
    *   The nuance of the Japanese text is critical.
    *   Even during refactoring, keep the text exactly as it is.
*   **Safety First:**
    *   Prioritize **robustness** and **error prevention** over code brevity.
    *   Always implement proper error handling.

## 3. Tech Stack & Architecture
*   **Core:** HTML5, CSS3, JavaScript (Vanilla ES6+).
*   **Structure Rule (Separation & Independence):**
    *   **Split Files:** Separate HTML/CSS/JS logic into dedicated files (index.html, style.css, script.js).
    *   **Keep Independent:** Each app/tool must be self-contained in its own folder. Do NOT create global dependencies that complicate deployment.
    *   **Responsive:** Use CSS Grid/Flexbox.

## 4. Coding Standards
*   **Language:** Comments & Commit Messages in **Japanese**.
*   **Readability:** Use descriptive variable names.
*   **Validation:** Always validate user inputs.

## 5. Instructions for Jules
*   **Scope:** Apply improvements to all subdirectories.
*   **Refactoring:**
    *   Split monolithic files while keeping full functionality.
    *   Organize folder structure for each app.
*   **Cleanup:**
    *   Analyze backup folders and files with _old, er1.
    *   If redundant, suggest deletion or move to an _archive folder.
*   **Context:** Read docs/IDEAS.md to understand the roadmap.

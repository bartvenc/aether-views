[![Aether Logo](aether-view/public/assets/AetherLogo.png)](https://aether-view.com/)
[![Netlify Status](https://api.netlify.com/api/v1/badges/7e14931b-79a8-4b85-acc2-7fd19bf7355e/deploy-status)](https://aether-view.com/)
# Aether Stream: Personal Project - Work in Progress (Modern Web & AI Exploration)

**Aether Stream** is a content discovery web application for movies and TV shows.  This is a personal hobby project and a **work in progress**, built to explore modern web development with Angular and experiment with integrating AI-driven recommendations.  It's been a fantastic learning experience, allowing me to challenge myself with new technologies and apply them in a practical, user-focused way.  Think of it as a playground for code and AI, rather than a polished product (yet!).

## Project Highlights: Core Concepts & Ongoing Development

Aether Stream is more about the journey and learning than a finished product.  Here are the key areas I'm currently focused on, and what's coming next:

### Intelligent Content Discovery (Experimental & Evolving)

*   **Two-Stage Recommendation System (Under Development):**  Exploring a balanced approach to AI recommendations:
    *   **Stage 1: Local & Cloud LLM (Fast but Initial):**  Faster, initial recommendations are generated using a Large Language Model. This stage uses both local (Ollama on my trusty 3080!) and cloud (Runpod) LLM deployments. Performance can vary, especially during peak times on my home server!
    *   **Stage 2: Online Data Enrichment (Enhancing Relevance):**  Augmenting initial AI suggestions with real-time web data to improve recommendation quality and breadth of discovery.
    *   **Performance Note:** *AI recommendations, particularly the online enhancement, can be a bit slow at times.  Please be kind to my home GPU and Runpod budget – avoid spamming the AI search! 😉*
*   **Natural Language Search (Basic Implementation):**  Basic natural language query input is functional, allowing experimentation with LLM-driven intent interpretation.
*   **Curated Collections (Themed Results):**  Search results are grouped into themed collections for better browsing and organization of recommendations.

### Functional Filtering & User-Friendly Interface

*   **Dynamic Filters (Angular Material):**  Filters for genres, years, studios, networks, and keywords, built with Angular Material for a clean and functional UI.
*   **Performance Considerations (Front-End Focused):**
    *   **Angular 19 Signals:** Utilizing Angular's latest reactivity features.
    *   **Infinite Scroll & Lazy Loading:** Implementing performance optimizations for a smoother user experience.
*   **Region Awareness (Initial Implementation):**
    *   **Automatic Region Detection:**  Region-based content tailoring (though still being refined).
    *   **Manual Region Override:**  Manual region selection for flexibility.
*   **Responsive Design (Mobile-First):**  Designed to be usable across devices.

## 🛠 Technical Architecture: Building Blocks & Future Expansion

Aether Stream is structured as a full-stack application, built with modularity and future extensibility in mind.

### Frontend (Angular 19 - Modern & Reactive)

*   **Component Architecture:** Reusable Angular components for maintainability.
*   **Angular Signals:** Reactive state management using Angular Signals.
*   **UI & Styling:** Tailwind CSS and Angular Material UI.
*   **Performance:**  Lazy loading, image optimization, and caching techniques.

### Backend (FastAPI & Python - Lightweight & Asynchronous)

*   **FastAPI (Python):** Backend API built with FastAPI for speed and async capabilities.
*   **Python AI Logic:** Python code handles the two-stage AI recommendation process and web scraping.
*   **Simple Request Queue:**  Basic Python-based queue for managing AI requests.
*   **Web Scraping (Playwright & BeautifulSoup):**  Data extraction using Playwright and BeautifulSoup.
*   **LLM Integration (Ollama & Runpod):**  Integration with local Ollama and cloud Runpod LLMs.

### Infrastructure & Deployment (Streamlined)

*   **Netlify (Frontend):**  Frontend hosting on Netlify.
*   **Google Cloud Run (Backend):**  Backend API deployed to Google Cloud Run via Docker.
*   **Cloudflare Tunnel:** Basic security and access via Cloudflare Tunnel.
*   **Docker:** Containerization for environment consistency.

## 🛠 Current Tech Stack:

*   **Frontend:** Angular 19, TypeScript, Tailwind CSS, Angular Material UI, Swiper.js, HTML5, SCSS
*   **Backend:** Python, FastAPI, Uvicorn, Pydantic, BeautifulSoup4, Playwright, Python Asyncio
*   **AI/ML:** Ollama, Runpod(serverless), Llama 3.1 model
*   **Deployment:** Docker, Google Cloud Run, Netlify, Cloudflare, GitHub
*   **APIs & Tools:** TMDB API, IP Geolocation API, Material Icons, ngx-infinite-scroll, etc.

##  🚀  Ongoing Development & Feedback Welcome!

Aether Stream is very much a **work in progress**.  Future development plans include:

*   **Performance Improvements:** Optimizing AI response times and overall application speed.
*   **User Accounts & Lists:** Implementing user accounts for personalized lists and recommendations.
*   **Direct Watch Links:** Integrating links to streaming providers for easier access to content.
*   **Expanded Feature Set:**  Continuously adding new features and refining existing ones.

**Feedback is highly appreciated!**  If you have any tips, tricks, or suggestions, feel free to reach out via GitHub or email. All constructive feedback is welcome as I continue to learn and improve this project.

---

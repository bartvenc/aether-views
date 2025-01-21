# Aether Stream
[![Netlify Status](https://api.netlify.com/api/v1/badges/7e14931b-79a8-4b85-acc2-7fd19bf7355e/deploy-status)](https://aether-view.com/)

A next-generation streaming content discovery platform powered by AI, built with Angular 19 and modern web technologies. Aether Stream helps users discover movies and TV shows through an intuitive interface and intelligent recommendations.

[![Aether Logo](aether-view/public/assets/AetherLogo.png)](https://aether-view.com/)

## 🌟 Key Features

### 🤖 AI-Powered Content Discovery
- **Two-Stage Recommendation System**:
  - First stage uses offline LLM for lightning-fast initial suggestions
  - Second stage enhances results by searching online data sources
  - Concurrent request handling through an efficient queue system
- **Natural Language Understanding**: Users can describe what they want to watch in plain English
- **Smart Content Curation**: Each search creates a themed collection that's preserved for future reference

### 🎯 Smart Content Filtering
- **Dynamic Genre System**: Intuitive genre filtering with visual representation
- **Advanced Search**: Multi-parameter search with studios, networks, and keywords
- **Infinite Scroll**: Smooth content loading with optimized performance
- **Watch History**: Subtle indicators for previously viewed content

### 🌍 Region-Aware Experience
- **Automatic Location Detection**: Uses browser data and IP geolocation
- **Region-Specific Content**: Automatically adjusts ratings, release dates, and availability
- **24-Hour Cache**: Stores region data locally to minimize API calls
- **Region Override**: Manual region selection for travelers or VPN users

### 🎨 Modern UI/UX
- **Responsive Design**: Optimized for all devices with mobile-first approach
- **Animated Transitions**: Smooth state changes and loading indicators
- **Gesture Support**: Touch-friendly interface with swipe navigation
- **Accessibility**: WCAG compliant with full keyboard navigation

## 🛠 Technical Deep Dive

### Frontend Architecture
- **Angular 19**: Latest features including signals for state management
- **Performance Optimizations**:
  - Lazy loading for all routes
  - Image lazy loading with blur placeholders
  - Text compression
  - Asset preloading
  - Response caching
- **Component Strategy**: Reusable, atomic design with smart/dumb component pattern

### Backend Intelligence
- **Search Agent System**:
  ```python
  class OnlineAgent:
    def process_request(self, query):
      # Two-stage processing
      initial_results = self.offline_llm.process(query)
      enhanced_results = self.online_search.enhance(initial_results)
      return self.merge_results(initial_results, enhanced_results)
    ```

### Queue Management:
- Request prioritization
- Concurrent user handling
- Resource allocation
- Error recovery

## 🛠 Tech Stack
- Frontend: Angular 19, TailwindCSS, Material UI, Swiper.js
- Backend: FastAPI, Ollama, BeautifulSoup, Playwright(Headless Chromium)
- AI/ML: Ollama, Llama3.1
- Infrastructure: Github, Netlify, Cloudflare, Zero Trust
- APIs: TMDB, IP Geolocation
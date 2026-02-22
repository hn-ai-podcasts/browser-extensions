<div align="center">
  <img src="src/firefox/icons/hn_podcast_logo.svg" width="128" height="128" alt="HN AI Podcast Logo">

  # Hacker News AI Podcast

  **Listen to Hacker News stories as AI-generated podcasts.**
  <br>
  Available in English and French (more soon, request your native language).

  <p>
    <a href="https://chrome.google.com/webstore/detail/YOUR_ID_HERE">
      <img src="https://img.shields.io/chrome-web-store/v/YOUR_ID_HERE?label=Chrome%20Web%20Store&logo=google-chrome&logoColor=white&color=blue" alt="Chrome Extension">
    </a>
    <a href="https://addons.mozilla.org/firefox/addon/YOUR_ID_HERE">
      <img src="https://img.shields.io/amo/v/YOUR_ID_HERE?label=Firefox%20Add-ons&logo=firefox-browser&logoColor=white&color=orange" alt="Firefox Add-on">
    </a>
  </p>
</div>

---

**⚠️ Experimental & Non-Commercial Service**
> *Please note that this is an experimental project built for the community. The service is provided "as is", relies on shared quotas, and might be unstable, limited, or shut down at any time without prior notice.*

## 🎧 What is this?

**HN AI Podcast** transforms Hacker News discussions into AI audio podcasts.

Listen to a synthesized conversation that summarizes the key points, debates, and insights from the community.

### Key Features

- **🎙️ AI-Generated Audio**: High-quality conversation between two AI hosts (powered by NotebookLM).
- **🌍 Multi-language**: Listen to stories in **English** or **French**.
- **🔓 Open Access**: Every podcast generated is available to everyone. You benefit from what others have created.
- **📡 RSS Feed**: Subscribe to the podcast feed directly in your favorite player (Apple Podcasts, Pocket Casts, etc.).

## 🚀 How it works

1. [**Browse Hacker News**](https://news.ycombinator.com) as usual.
2. Look for the **"▶ Podcast"** button next to stories.
3. Click to listen!
   - If the audio exists, it plays immediately.
   - If not, you can **generate it** (using available community credits).

## 🛡️ Privacy

- **No Cookies**: The extension does not use cookies.
- **No User Tracking**: It does not track your browsing history or personal data.
- **Minimal Data**: The only data processed is your IP address for rate limiting, which is **never shared** with third parties.
- **Third-Party Safety**: Audio generation relies on [AutoContentAPI](https://autocontentapi.com) and Google's NotebookLM. **No user data** is sent to these services; only the public HN story content is processed.

## ⚖️ Fair Use & Quotas

To ensure the service remains free and available to everyone, generation is limited by community credits.

**Creation Rules:**
To be eligible for podcast generation, a story must meet quality criteria:
- **Score**: > 50 points
- **Comments**: > 100 comments
- **Age**: Between 6 hours and 5 days

*These limits are dynamic and may change based on server load and API costs. Check the popup extension to get the updated parameters.*

## 🛠️ Built With

This project is a transparent, open-source experiment crafted with:

- **Runtime**: [Bun](https://bun.sh) (fast, modern JS runtime)
- **Code Quality**: [Biome](https://biomejs.dev) (Rust-based linter/formatter)
- **AI Assistance**: Entirely architected and coded with **Gemini 3 Pro** via **Perplexity.ai**.

## 📦 Installation (Developers)

```bash
# Clone the repo
git clone https://github.com/yourusername/hn-podcast-extension.git
cd hn-podcast-extension

# Install dependencies (using Bun)
bun install

# Build for Chrome & Firefox
bun run build

# Privacy Policy — HN AI Podcasts

**Last updated: February 2026**

## Overview
HN AI Podcasts ("the Extension") is a Chrome and Firefox browser extension that allows users to generate and listen to AI-powered podcast summaries of Hacker News stories. This policy explains what data is collected, how it is used, and what rights you have.

## Data Collected

### Data sent to our servers
When you interact with the Extension (e.g., requesting or playing a podcast), the following data is transmitted to our API hosted at `hn-ai-podcast.duckdns.org`:

- **Hacker News story IDs** — used to identify which story's podcast to generate or retrieve. Story IDs are public identifiers that do not contain any personally identifiable information.
- **Selected language** — sent as part of the API request to retrieve or generate a podcast in the correct language.
- **Your IP address** — automatically transmitted as part of any HTTP request. It is used solely for **rate limiting purposes** (to prevent abuse and ensure fair usage for all users). IP addresses are not stored beyond the duration necessary for rate limiting and are not linked to any user profile.

### Data stored locally
The Extension stores the following data exclusively in your browser's local storage, on your device only:

- Audio player state (current story, playback position, play/pause status)
- User preferences (language selection, highlight toggle)

This data never leaves your device and is not transmitted to any server.

## Data We Do NOT Collect
- We do not collect your name, email address, or any other personal identifier.
- We do not track your browsing history beyond Hacker News story IDs you interact with.
- We do not use cookies.
- We do not use any third-party analytics or advertising services.
- We do not sell, rent, or share your data with any third party.

## Data Retention
- **IP addresses** are retained only for the duration necessary for rate limiting (typically a rolling window of a few minutes to hours) and are then discarded.

## Legal Basis (GDPR)
For users in the European Economic Area, the legal basis for processing your IP address is our **legitimate interest** (Article 6(1)(f) GDPR) in protecting the service from abuse and ensuring its availability to all users.

## Third-Party Services
The Extension interacts exclusively with:
- **Hacker News** (`news.ycombinator.com`) — a public website, subject to its own privacy policy.
- **Our own API** (`hn-ai-podcast.duckdns.org`) — governed by this policy.

No data is shared with any other third party.

## Changes to This Policy
We may update this policy from time to time. Any changes will be reflected by updating the "Last updated" date above.

## Contact
If you have any questions about this privacy policy, feel free to open an Issue on Github.

export const About = () => {
  return (
    <div className="story-container">
      <div className="story">
        <div className="story-header">
          <h2 className="story-title">About</h2>
        </div>
        <div className="story-content">
          <p>
            <strong>Hacker News • Classic Style</strong> is an alternative front-end for Hacker News
            that recreates the beloved classic Slashdot interface. Browse HN stories with the familiar
            look and feel that made Slashdot a cornerstone of tech discussion.
          </p>

          <p>This site uses performance monitoring to optimize page loading and user experience.</p>

          <h3>Features</h3>
          <ul>
            <li>Classic Slashdot-inspired design and typography</li>
            <li>Threaded comment system with proper nesting</li>
            <li>Multiple view modes: Title, Compact, and Full views</li>
            <li>Keyboard navigation and accessibility support</li>
            <li>Responsive design for mobile and desktop</li>
            <li>Article summaries when available</li>
            <li>Clean, distraction-free reading experience</li>
            <li>No ads</li>
            <li>Privacy-focused analytics and performance monitoring</li>
          </ul>

          <h3>Why use this interface?</h3>
          <p>
            If you miss the classic Slashdot experience but want to read Hacker News content,
            this interface bridges that gap. The familiar green-on-white color scheme,
            threaded discussions, and clean typography provide a nostalgic yet functional
            way to browse modern tech news and discussions.
          </p>

          <p>
            The interface is optimized for readability and discussion flow, making it easy
            to follow complex comment threads and discover interesting stories without
            visual clutter.
          </p>

          <h3>Data Source</h3>
          <p>
            All content is sourced directly from the{' '}
            <a
              href="https://github.com/HackerNews/API"
              target="_blank"
              rel="noopener noreferrer"
            >
              official Hacker News API
            </a>
            . Stories, comments, and user data remain exactly as they appear on the original site.
          </p>

          <h3>Privacy & Data Collection</h3>
          <p>
            This site uses the following data collection and third-party services:
          </p>

          <h4>Analytics & Performance Monitoring</h4>
          <ul>
            <li><strong>Umami Analytics:</strong> Privacy-focused, cookieless analytics tracking page views and user interactions</li>
            <li><strong>Browser Performance Metrics:</strong> Page load timings, Core Web Vitals, API response times, and memory usage</li>
            <li><strong>Local Session Storage:</strong> Hidden articles preferences (stored in your browser only)</li>
          </ul>

          <h4>Article Summary Service</h4>
          <ul>
            <li><strong>AllOrigins.win & WhateverOrigin.org:</strong> Third-party CORS proxy services used to fetch article content for summaries</li>
            <li>Your IP address may be logged by these services when fetching article summaries</li>
          </ul>

          <p>
            <strong>Data Usage:</strong> Analytics help improve site performance and user experience.
            No personal browsing history beyond this site is tracked. Article summary services
            are only contacted when you view stories with summary features enabled.
          </p>
        </div>
      </div>
    </div>
  );
};
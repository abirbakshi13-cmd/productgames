// Candidate RSS/Atom feeds for the Receipts news pipeline.
// Some of these URLs are from memory and may be dead or moved; prepStories.js
// does a feed-health check + one-shot discovery (homepage <link rel=alternate>,
// then /feed and /rss) at startup and skips whatever doesn't resolve.
export const FEEDS = [
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', scope: 'national', note: '' },
  { name: 'NPR Education', url: 'https://feeds.npr.org/1013/rss.xml', scope: 'topic', note: 'loans, campus' },
  { name: 'NPR Economy', url: 'https://feeds.npr.org/1017/rss.xml', scope: 'topic', note: 'prices, work' },
  { name: 'The Hill', url: 'https://thehill.com/feed/', scope: 'national', note: '' },
  { name: 'Fox News', url: 'https://moxie.foxnews.com/google-publisher/latest.xml', scope: 'national', note: '' },
  { name: 'Fox Business', url: 'https://moxie.foxnews.com/google-publisher/personal-finance.xml', scope: 'topic', note: '' },
  { name: 'CNBC Top News', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', scope: 'national', note: 'business' },
  { name: 'Washington State Standard', url: 'https://washingtonstatestandard.com/feed/', scope: 'local', note: '' },
  { name: 'KUOW', url: 'https://www.kuow.org/rss.xml', scope: 'local', note: 'unsure URL' },
  { name: 'GeekWire', url: 'https://www.geekwire.com/feed/', scope: 'topic', note: 'tech, platform policies' },
  { name: 'The Urbanist', url: 'https://www.theurbanist.org/feed/', scope: 'local', note: 'Seattle transit and housing' },
];

export default FEEDS;

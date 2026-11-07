// Overwrites PLACEHOLDER. See docs/receipts-spec.md Prompt 1B.
import stories from './data/stories.json';

export { stories };

export const getStory = (id) => stories.find((s) => s.id === id) || null;

// Featured order is chosen deliberately for the demo; only fall back to a
// date sort when nobody has been marked featured.
export const feedStories = () => {
  const featured = stories.filter((s) => s.featured);
  const pool = featured.length ? featured : stories;
  const ordered = featured.length
    ? pool
    : [...pool].sort((a, b) => (b.source?.date || '').localeCompare(a.source?.date || ''));
  return ordered.slice(0, featured.length ? featured.length : 4);
};

import { useEffect, useMemo, useState } from 'react';
import { getProfile, computeReceipt } from '../shared/api.js';
import { feedStories } from '../stories.js';
import ReceiptChip from '../components/ReceiptChip.jsx';
import './Feed.css';

// Parse "YYYY-MM-DD" as a LOCAL date so relative-day math never shifts a day.
function parseLocalDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function relativeDate(dateStr) {
  const date = parseLocalDate(dateStr);
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function firstSentence(text) {
  if (!text) return '';
  // A sentence ends at .!? followed by whitespace + a capital, or by the end of the string.
  // Without the lookahead, "the U.S. and Iran" and "$22.14 an hour" truncate mid-sentence.
  const m = text.match(/^.*?[.!?](?=\s+[A-Z$"'(]|\s*$)/s);
  return (m ? m[0] : text).trim();
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" />
    </svg>
  );
}

/**
 * Props: { profile, onOpenStory, onOpenProfile }
 * `profile` is optional; falls back to getProfile() and re-reads it on
 * "profilechange" / "storage" so chips update instantly when the profile
 * changes elsewhere (e.g. Profile screen, or the dev panel in previewB).
 */
export default function Feed({ profile: profileProp, onOpenStory, onOpenProfile }) {
  const [profile, setProfile] = useState(() => profileProp || getProfile());

  useEffect(() => {
    if (profileProp) {
      setProfile(profileProp);
      return undefined;
    }
    const refresh = () => setProfile(getProfile());
    refresh();
    window.addEventListener('profilechange', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('profilechange', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [profileProp]);

  const stories = useMemo(() => feedStories(), []);

  const items = useMemo(
    () =>
      stories.map((story) => {
        let receipt;
        try {
          receipt = computeReceipt(profile, story);
        } catch (err) {
          console.warn('computeReceipt failed for story', story?.id, err);
          receipt = { status: 'needs_info' };
        }
        return { story, receipt };
      }),
    [stories, profile],
  );

  return (
    <div className="feed">
      <header className="feed-header">
        <h1 className="feed-title">Receipts</h1>
        <button
          type="button"
          className="feed-profile-btn"
          aria-label="Your profile"
          onClick={() => onOpenProfile?.()}
        >
          <ProfileIcon />
        </button>
      </header>
      <p className="feed-privacy">
        <LockIcon />
        Calculated on your phone. Your answers never leave it.
      </p>
      <div className="feed-body">
        <h2 className="feed-section">This week</h2>
        {items.length === 0 ? (
          <p className="feed-empty">No stories yet. Run npm run prep.</p>
        ) : (
          <ul className="feed-list">
            {items.map(({ story, receipt }) => (
              <li key={story.id}>
                <button type="button" className="feed-card" onClick={() => onOpenStory?.(story.id)}>
                  <div className="feed-card-meta">
                    {story.source?.name}
                    {story.source?.date ? ` · ${relativeDate(story.source.date)}` : ''}
                  </div>
                  <div className="feed-card-headline">{story.headline}</div>
                  <div className="feed-card-summary">{firstSentence(story.summary)}</div>
                  <ReceiptChip receipt={receipt} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

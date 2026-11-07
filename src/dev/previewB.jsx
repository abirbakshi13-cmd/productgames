// Person B preview page. Stands in for Person A's App/routing before integration.
// Served by the dev server at http://localhost:5173/preview-b.html
import { lazy, StrictMode, Suspense, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { clearProfile, saveProfile } from '../shared/api.js';
import { getStory } from '../stories.js';
import PhoneFrame from '../components/PhoneFrame.jsx';
import '../styles/receipts-theme.css';

const Feed = lazy(() => import('../screens/Feed.jsx'));
const StoryDetail = lazy(() => import('../screens/StoryDetail.jsx'));

function PreviewB() {
  const [storyId, setStoryId] = useState(null);

  return (
    <Suspense fallback={<div>Loading…</div>}>
      {storyId ? (
        // `story` is what B's StoryDetail takes; `storyId` keeps A's stub working too.
        <StoryDetail
          story={getStory(storyId)}
          storyId={storyId}
          onBack={() => setStoryId(null)}
        />
      ) : (
        <Feed onOpenStory={setStoryId} onOpenProfile={() => {}} />
      )}
    </Suspense>
  );
}

const devPanel = {
  position: 'fixed',
  right: 12,
  bottom: 12,
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 10,
  borderRadius: 10,
  background: 'rgba(17,24,39,.92)',
  font: '12px var(--r-font)',
  color: '#fff',
};

function DevPanel() {
  return (
    <div style={devPanel}>
      <strong style={{ fontSize: 11, opacity: 0.7 }}>Dev panel</strong>
      <button onClick={() => saveProfile({ loans: 'federal' })}>Loans: federal</button>
      <button onClick={() => saveProfile({ loans: 'none' })}>Loans: none</button>
      <button onClick={() => clearProfile()}>Reset profile</button>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PhoneFrame>
      <PreviewB />
    </PhoneFrame>
    <DevPanel />
  </StrictMode>,
);

// PLACEHOLDER, owned by Person B agent, overwrite freely
import stories from './data/stories.json';

export { stories };
export const getStory = (id) => stories.find((s) => s.id === id);

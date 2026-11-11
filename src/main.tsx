import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { useDisplayStore } from '@/state/displayStore';
import { useChannelStore } from '@/state/channelStore';
import { useEnvironmentStore } from '@/state/environmentStore';
import { useGuideStore } from '@/state/guideStore';
import { useHauntStore } from '@/state/hauntStore';
import { usePlayerStore } from '@/state/playerStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useIntroStore } from '@/state/introStore';
import { useUiStore } from '@/state/uiStore';
import '@/styles/tokens-2050.css';
import '@/styles/fonts-2050.css';
import '@/scene/materials/rooms/skins2d.css';
import '@/ui/ui.css';
import '@/ui/glass.css';
import '@/scene/materials/holo2d/holo2d.css';

// Test hook (dev and test builds only): lets QA read store state without reading pixels.
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  (window as unknown as { __APP_TEST__: unknown }).__APP_TEST__ = {
    useIntroStore,
    useDisplayStore,
    useUiStore,
    useHauntStore,
    useChannelStore,
    useEnvironmentStore,
    useGuideStore,
    usePlayerStore,
    useSettingsStore,
  };
}

// Apply Calm (stored choice or the OS preference) before the first paint.
document.documentElement.dataset.calm = String(useDisplayStore.getState().reducedMotion);

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

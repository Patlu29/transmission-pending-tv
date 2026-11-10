import { useCallback, useEffect, useState } from 'react';
import { startAudioEngine } from '@/hooks/audioEngine';
import { useBootstrap } from '@/hooks/useBootstrap';
import { useIntroClock } from '@/hooks/useIntroClock';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useRenderMode } from '@/hooks/useRenderMode';
import { handleStageKey } from '@/hooks/useStageShortcuts';
import { useDisplayStore } from '@/state/displayStore';
import { useIntroStore } from '@/state/introStore';
import { Dock } from '@/ui/components/Dock';
import { HitLayer } from '@/ui/components/HitLayer';
import { Hud } from '@/ui/components/Hud';
import { LiveRegion } from '@/ui/components/LiveRegion';
import { Notices } from '@/ui/components/Notices';
import { SceneHost } from '@/ui/components/SceneHost';
import { Screen2D } from '@/ui/components/Screen2D';
import { ScreenSizer } from '@/ui/components/ScreenSizer';
import { StartScreen } from '@/ui/components/StartScreen';
import { Transcript } from '@/ui/components/Transcript';
import { TranscriptDialog } from '@/ui/components/TranscriptDialog';
import { startTeletextScreen } from '@/ui/teletext';

export default function App() {
  const mode = useDisplayStore((s) => s.renderMode);
  const calm = useDisplayStore((s) => s.reducedMotion);
  const status = useIntroStore((s) => s.status);
  const wide = useMediaQuery('(min-width: 1024px)');
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const onSceneLoaded = useCallback(() => setSceneLoaded(true), []);

  useMotionPreference();
  useRenderMode();
  useIntroClock();
  useBootstrap(sceneLoaded);

  useEffect(() => startTeletextScreen(), []);
  useEffect(() => startAudioEngine(), []);

  // CSS reads this to collapse transitions under reduced motion or Calm (tokens.css only covers the media query).
  useEffect(() => {
    document.documentElement.dataset.calm = String(calm);
  }, [calm]);

  const layout = mode === '3d-set' || (mode === '2d' && wide) ? 'set' : 'screen';
  return (
    <div
      className="app"
      data-mode={mode}
      data-layout={layout}
      data-status={status}
      data-calm={calm}
    >
      <Notices />
      <div
        className="stage"
        role="group"
        aria-label="Television. The show is also available as text."
        tabIndex={0}
        onKeyDown={handleStageKey}
      >
        {mode === '2d' ? <Screen2D /> : <SceneHost onLoaded={onSceneLoaded} />}
        {mode === '3d-screen' && <HitLayer />}
        <Hud />
        <StartScreen />
        <Dock />
      </div>
      <ScreenSizer />
      <Transcript />
      <TranscriptDialog />
      <LiveRegion />
    </div>
  );
}

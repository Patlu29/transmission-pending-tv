import { useCallback, useEffect, useState } from 'react';
import { startAudioEngine } from '@/hooks/audioEngine';
import { useBootstrap } from '@/hooks/useBootstrap';
import { useIntroClock } from '@/hooks/useIntroClock';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useRenderMode } from '@/hooks/useRenderMode';
import { handleStageKey } from '@/hooks/useStageShortcuts';
import { startHauntScheduler } from '@/state/hauntScheduler';
import { useDisplayStore } from '@/state/displayStore';
import { useIntroStore } from '@/state/introStore';
import { CreditsDialog } from '@/ui/components/CreditsDialog';
import { Dock } from '@/ui/components/Dock';
import { KeyboardHelp } from '@/ui/components/KeyboardHelp';
import { NoticeDialog } from '@/ui/components/NoticeDialog';
import { RoomPicker } from '@/ui/components/RoomPicker';
import { Room2D } from '@/ui/components/Room2D';
import { GuidePanel } from '@/ui/guide/GuidePanel';
import { PlayerHost } from '@/ui/player/PlayerHost';
import { usePlayerLayout } from '@/ui/player/usePlayerLayout';
import { startRoomSound } from '@/hooks/roomSound';
import { useColourActive } from '@/state/colourActive';
import { useChannelStore } from '@/state/channelStore';
import { HitLayer } from '@/ui/components/HitLayer';
import { Hud } from '@/ui/components/Hud';
import { LiveRegion } from '@/ui/components/LiveRegion';
import { Notices } from '@/ui/components/Notices';
import { SceneHost } from '@/ui/components/SceneHost';
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
  useEffect(() => startHauntScheduler(), []);
  useEffect(() => startRoomSound(), []);

  // CSS reads this to collapse transitions under reduced motion or Calm (tokens.css only covers the media query).
  useEffect(() => {
    document.documentElement.dataset.calm = String(calm);
  }, [calm]);

  const colourActive = useColourActive();
  const live = useChannelStore((s) => s.current !== null);
  const { layout: playerLayout } = usePlayerLayout();
  const focusing = live && playerLayout.kind === 'focus';
  const layout = mode === '3d-set' || (mode === '2d' && wide) ? 'set' : 'screen';
  return (
    <div
      className="app"
      data-mode={mode}
      data-layout={layout}
      data-status={status}
      data-calm={calm}
      data-colour={colourActive ? 'on' : 'off'}
      data-focus={focusing}
      data-live={live}
    >
      <Notices />
      <div
        className="stage"
        role="group"
        aria-label="Television. The show is also available as text."
        tabIndex={0}
        onKeyDown={handleStageKey}
      >
        <div className="stage__ring" aria-hidden="true" />
        {mode === '2d' ? <Room2D /> : <SceneHost onLoaded={onSceneLoaded} />}
        <PlayerHost />
        {mode === '3d-screen' && <HitLayer />}
        <Hud />
        <StartScreen />
        <Dock />
      </div>
      <GuidePanel />
      <RoomPicker />
      <NoticeDialog />
      <CreditsDialog />
      <KeyboardHelp />
      <ScreenSizer />
      <Transcript />
      <TranscriptDialog />
      <LiveRegion />
    </div>
  );
}

import { useProgress } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Component, useEffect, type ReactNode } from 'react';
import { useEnvironmentStore } from './environments/seam.ts';
import { useDisplayStore } from './integration/stores';

/** Reports webglLost (architecture 4.1). Preventing default lets the context be restored. */
export function ContextWatcher() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const dom = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      useDisplayStore.getState().markWebglLost();
    };
    dom.addEventListener('webglcontextlost', lost);
    return () => dom.removeEventListener('webglcontextlost', lost);
  }, [gl]);
  return null;
}

/** Real asset progress from the three.js loading manager (never faked). */
export function ProgressReporter() {
  const { active, progress } = useProgress();
  useEffect(() => {
    if (active) {
      useDisplayStore.getState().setLoadProgress(Math.min(0.99, progress / 100));
      const env = useEnvironmentStore.getState();
      if (env.loading) env.setLoading(Math.min(0.99, progress / 100));
    }
  }, [active, progress]);
  return null;
}

/** Mounts only once everything inside the Suspense boundary above it has resolved. */
export function ReadyReporter() {
  useEffect(() => {
    const d = useDisplayStore.getState();
    d.setLoadProgress(1);
    d.setSceneReady(true);
  }, []);
  return null;
}

interface BoundaryProps {
  children: ReactNode;
  onError(error: Error): void;
}

export class ErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Mounts when the room on screen has been built. Tells environmentStore it is ready once the room shown
 * is the room chosen (the previous room stays up until then). Always fires, so `loading` never sticks.
 */
export function RoomReadyReporter({ shown }: { shown: string }) {
  useEffect(() => {
    const env = useEnvironmentStore.getState();
    if (env.id === shown) env.setReady();
  }, [shown]);
  return null;
}

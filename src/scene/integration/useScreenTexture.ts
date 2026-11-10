// INTEGRATION SEAM 3 of 4: the screen picture as a CanvasTexture.
//
// Real source: displayStore.screenCanvas, drawn by the frontend's teletext
// rasteriser (ADR 0005), with displayStore.screenVersion incremented per redraw.
// While neither exists this draws a PLACEHOLDER test-card-like canvas of its own.
import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { CanvasTexture } from 'three';
import { prepareScreenTexture } from '../shaders/crt/createCrtMaterial';
import { useDisplayStore, useIntroStore } from './stores';

function drawPlaceholder(c: HTMLCanvasElement, label: string) {
  const g = c.getContext('2d');
  if (!g) return;
  const { width: w, height: h } = c;
  g.fillStyle = '#3c3c3c';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#8c8c8c';
  g.lineWidth = 2;
  for (let i = 1; i < 20; i++) {
    g.beginPath();
    g.moveTo((w * i) / 20, 0);
    g.lineTo((w * i) / 20, h);
    g.stroke();
  }
  for (let i = 1; i < 15; i++) {
    g.beginPath();
    g.moveTo(0, (h * i) / 15);
    g.lineTo(w, (h * i) / 15);
    g.stroke();
  }
  g.strokeStyle = '#e8e8e8';
  g.lineWidth = 8;
  g.beginPath();
  g.arc(w / 2, h / 2, h * 0.3, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#000';
  g.fillRect(w * 0.2, h * 0.72, w * 0.6, h * 0.12);
  g.fillStyle = '#e8e8e8';
  g.font = `600 ${Math.round(h * 0.05)}px monospace`;
  g.textAlign = 'center';
  g.fillText(label, w / 2, h * 0.795);
}

export function useScreenTexture(): CanvasTexture | null {
  const invalidate = useThree((s) => s.invalidate);
  const canvas = useDisplayStore((s) => s.screenCanvas);
  const [texture, setTexture] = useState<CanvasTexture | null>(null);

  // Build the texture around whichever canvas is current; dispose when it changes.
  useEffect(() => {
    let source = canvas ?? null;
    if (!source) {
      source = document.createElement('canvas');
      source.width = 960;
      source.height = 720;
    }
    const tex = prepareScreenTexture(new CanvasTexture(source));
    const placeholder = !canvas;
    let lastKey = '';
    const redraw = () => {
      const { loadProgress, screenVersion } = useDisplayStore.getState();
      const { status } = useIntroStore.getState();
      const key = placeholder
        ? `${status}|${Math.round(loadProgress * 100)}`
        : String(screenVersion);
      if (key === lastKey) return; // unrelated store change
      lastKey = key;
      if (placeholder) {
        drawPlaceholder(
          source,
          status === 'loading' ? `TUNING... ${Math.round(loadProgress * 100)}%` : 'STAND BY',
        );
      }
      tex.needsUpdate = true; // only when the store changes, never per frame
      invalidate();
    };
    redraw();
    const unsubs = [useDisplayStore.subscribe(redraw), useIntroStore.subscribe(redraw)];
    setTexture(tex); // eslint-disable-line react-hooks/set-state-in-effect -- texture must follow the current canvas
    return () => {
      unsubs.forEach((u) => u());
      tex.dispose();
    };
  }, [canvas, invalidate]);

  return texture;
}

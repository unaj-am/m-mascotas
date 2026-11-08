import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { TrackingMapData } from '../state/tracking-map';
import { trackingMapHtml } from './tracking-map-html';

export function TrackingMap({ data }: { data: TrackingMapData }) {
  const frame = useRef<HTMLIFrameElement>(null), latest = useRef(data); latest.current = data;
  const [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'GPS_MAP_READY') frame.current?.contentWindow?.postMessage(latest.current, '*');
      if (event.data?.type === 'GPS_MAP_ERROR') setError(true);
    };
    window.addEventListener('message', handle); return () => window.removeEventListener('message', handle);
  }, []);
  useEffect(() => { frame.current?.contentWindow?.postMessage(data, '*'); }, [data]);
  return <View style={{ height: 430, overflow: 'hidden', borderRadius: 14 }}>
    {error && <Pressable accessibilityRole="button" onPress={() => { setError(false); setAttempt((value) => value + 1); }} style={{ padding: 12 }}><Text>Volver a cargar el mapa</Text></Pressable>}
    <iframe key={attempt} ref={frame} title="Mapa del recorrido del paseador" srcDoc={trackingMapHtml} sandbox="allow-scripts allow-same-origin" style={{ width: '100%', flex: 1, border: 0 }} />
  </View>;
}

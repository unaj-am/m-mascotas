import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, Text, TurboModuleRegistry, View } from 'react-native';
import type WebViewType from 'react-native-webview';
import type { TrackingMapData } from '../state/tracking-map';
import { trackingMapHtml } from './tracking-map-html';

const source = { html: trackingMapHtml, baseUrl: 'https://mascotas.local' };
export function TrackingMap({ data }: { data: TrackingMapData }) {
  const ref = useRef<ComponentRef<typeof WebViewType>>(null);
  const [ready, setReady] = useState(false), [attempt, setAttempt] = useState(0), [error, setError] = useState(false);
  const available = !!TurboModuleRegistry.get('RNCWebViewModule');
  const WebView: typeof WebViewType | null = available ? require('react-native-webview').default : null;
  useEffect(() => { if (ready) ref.current?.injectJavaScript(`window.postMessage(${JSON.stringify(data)}, '*');true;`); }, [data, ready]);
  if (!WebView) return <Text>Instalá la nueva versión de Mascotas para abrir el mapa.</Text>;
  return <View style={{ height: 430, overflow: 'hidden', borderRadius: 14 }}>
    {error && <Pressable accessibilityRole="button" onPress={() => { setError(false); setReady(false); setAttempt((value) => value + 1); }} style={{ padding: 12 }}><Text>Volver a cargar el mapa</Text></Pressable>}
    <WebView key={attempt} ref={ref} source={source} javaScriptEnabled originWhitelist={['*']} geolocationEnabled={false} allowFileAccess={false} mixedContentMode="never"
      onShouldStartLoadWithRequest={(request) => request.url === 'about:blank' || request.url.startsWith('https://mascotas.local')}
      onMessage={(event) => { try { const value = JSON.parse(event.nativeEvent.data); if (value.type === 'GPS_MAP_READY') setReady(true); if (value.type === 'GPS_MAP_ERROR') setError(true); } catch {} }}
      onError={() => setError(true)} style={{ flex: 1, backgroundColor: '#faf8fc' }} />
  </View>;
}

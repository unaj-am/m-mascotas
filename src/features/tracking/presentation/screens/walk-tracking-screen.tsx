import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useWalkTracking } from '../hooks/use-walk-tracking';
import { TrackingMap } from '../components/tracking-map';
import { trackingMapData } from '../state/tracking-map';
import { createDashboardStyles, dashboardColors } from '../../../../core/ui/dashboard.styles';
import { walkStatusLabels } from '../../../walks/presentation/state/walk-display';
import { WalkTiming } from '../../../walks/presentation/components/walk-timing';

const s = createDashboardStyles(dashboardColors.owner);
export function WalkTrackingScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const { state, retry } = useWalkTracking(id);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(timer); }, []);
  const map = useMemo(() => state.status === 'ready' ? trackingMapData(state.data.current, state.data.history) : null, [state]);
  const latest = state.status === 'ready' ? state.data.current ?? state.data.history.at(-1) ?? null : null;
  return <>
    <Pressable accessibilityRole="button" onPress={onBack} style={s.textLink}><Text style={s.textLinkLabel}>Volver a mis paseos</Text></Pressable>
    {state.status === 'loading' && <View style={s.surface}><ActivityIndicator color={dashboardColors.owner.primary} /><Text style={s.notice}>Conectando el seguimiento…</Text></View>}
    {state.status === 'error' && <View style={s.surface}><Text accessibilityRole="alert" style={s.notice}>{state.message}</Text><Pressable accessibilityRole="button" onPress={retry} style={s.textLink}><Text style={s.textLinkLabel}>Volver a intentar</Text></Pressable></View>}
    {state.status === 'ready' && <>
      <View style={s.surface}><View style={s.walkHeader}><Text accessibilityRole="header" style={s.sectionTitle}>Seguimiento del paseo</Text><View style={s.badge}><Text style={s.badgeText}>{walkStatusLabels[state.data.walk.status]}</Text></View></View>
        <Text style={s.notice}>{state.data.walk.status === 'SCHEDULED' ? 'El paseo está confirmado. La ubicación aparecerá cuando el paseador lo inicie.' : state.data.walk.status === 'IN_PROGRESS' ? 'Ves la ubicación compartida por el paseador y los puntos del recorrido.' : 'El paseo terminó. Se muestra el recorrido registrado.'}</Text>
        <WalkTiming walk={state.data.walk} variant="owner" />
        {(state.data.fromCache || state.data.pendingWrites) && <Text style={s.notice}>Mostrando datos guardados o cambios pendientes de confirmación.</Text>}
      </View>
      {map?.target ? <View style={s.surface}><TrackingMap data={map} />
        {!!latest && <><Text style={s.detailText}>Última ubicación: {new Date(latest.recordedAt).toLocaleTimeString('es-AR')} · Precisión: {Math.round(latest.accuracy)} m</Text>
          {state.data.walk.status === 'IN_PROGRESS' && now - latest.recordedAt > 60000 && <Text style={s.notice}>La última ubicación tiene más de un minuto. Todavía no recibimos un punto nuevo.</Text>}</>}
        <Text style={s.notice}>La línea muestra los puntos GPS registrados. Los tramos sin señal pueden quedar separados.</Text>
      </View> : <View style={s.surface}>{state.data.loadingLocations && <ActivityIndicator color={dashboardColors.owner.primary} />}<Text style={s.emptyTitleLeft}>{state.data.walk.status === 'IN_PROGRESS' ? 'Esperando la ubicación del paseador' : state.data.walk.status === 'SCHEDULED' ? 'Esperando el inicio del paseo' : 'No hay recorrido registrado'}</Text>
        <Text style={s.notice}>{state.data.walk.status === 'IN_PROGRESS' ? 'El paseador debe permitir el GPS y compartir su ubicación desde el teléfono.' : 'El mapa se mostrará cuando haya puntos GPS reales.'}</Text></View>}
    </>}
  </>;
}

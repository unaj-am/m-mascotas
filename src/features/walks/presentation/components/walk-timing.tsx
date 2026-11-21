import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { elapsedWalkSeconds, formatWalkElapsed, type WalkTimingData } from '../state/walk-timing';
import { createDashboardStyles, dashboardColors } from '../../../../core/ui/dashboard.styles';

const styles = { owner: createDashboardStyles(dashboardColors.owner), walker: createDashboardStyles(dashboardColors.walker) };
const label = (value: number) => new Date(value).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export function WalkTiming({ walk, variant }: { walk: WalkTimingData; variant: keyof typeof styles }) {
  const [now, setNow] = useState(Date.now);
  const active = walk.status === 'IN_PROGRESS' && !!walk.startedAt;
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);
  const elapsed = elapsedWalkSeconds(walk, now), s = styles[variant];
  if (!walk.startedAt && !walk.finishedAt) return null;
  return <View style={{ gap: 8 }}>
    {!!walk.startedAt && <Text style={s.petDetail}>Inicio: {label(walk.startedAt)}</Text>}
    {!!walk.finishedAt && <Text style={s.petDetail}>Finalización: {label(walk.finishedAt)}</Text>}
    {elapsed !== null && <View><Text style={s.fieldLabel}>{active ? 'Tiempo transcurrido' : 'Tiempo realizado'}</Text><Text style={s.number}>{formatWalkElapsed(elapsed)}</Text></View>}
  </View>;
}

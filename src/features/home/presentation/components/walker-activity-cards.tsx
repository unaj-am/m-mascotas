import type { WalkerRequestSummary, WalkerWalkSummary } from '../../../../core/domain/entities/walker-dashboard';
import { DashboardIcon, type DashboardIconName } from './dashboard-icon';
import { colors, styles as s } from '../screens/walker-home.styles';
import type { WalkExecution } from '../../../walks/presentation/hooks/use-walk-execution';
import type { WalkAction } from '../../../../core/domain/use-cases/walk-execution-use-cases';
import { WalkTiming } from '../../../walks/presentation/components/walk-timing';
import { walkStatusLabels as walkStatus } from '../../../walks/presentation/state/walk-display';
import { useGpsSharing } from '../../../tracking/presentation/hooks/use-gps-sharing';

import { ActivityIndicator, Pressable, Text, View } from 'react-native';

const requestStatus = { PENDING: 'Pendiente', ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada' };
const dateLabel = (value: number | null) => value === null ? 'Fecha a confirmar' : new Date(value).toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
function petLabel(item: Pick<WalkerRequestSummary, 'petIds' | 'petNames'>) {
  const extra = Math.max(0, item.petIds.length - item.petNames.length);
  if (item.petNames.length) return `${item.petNames.join(', ')}${extra ? ` y ${extra} mascota${extra === 1 ? '' : 's'} más` : ''}`;
  return item.petIds.length ? `${item.petIds.length} mascota${item.petIds.length === 1 ? '' : 's'}` : 'Mascotas a confirmar';
}
function Icon({ name, size = 22 }: { name: DashboardIconName; size?: number }) {
  return <DashboardIcon name={name} size={size} color={colors.primary} />;
}
export type WalkerCardActions = { execution: WalkExecution; disabled: boolean; perform: (action: WalkAction, id: string) => void };
export function WalkerRequestCard({ request, execution, disabled, perform }: { request: WalkerRequestSummary } & WalkerCardActions) {
  const busy = execution.operation.busy && execution.operation.id === request.id && execution.operation.action === 'accept';
  return <View style={s.surface}>
    <View style={s.walkHeader}><Text style={s.requestTitle}>{request.ownerName || 'Solicitud de paseo'}</Text><View style={s.badge}><Text style={s.badgeText}>{requestStatus[request.status]}</Text></View></View>
    <View style={s.detailLine}><Icon name="calendar" size={20} /><View style={{ flex: 1 }}><Text style={s.fieldLabel}>Fecha y hora</Text><Text style={s.detailText}>{dateLabel(request.scheduledAt)}</Text></View></View>
    <View style={s.detailLine}><Icon name="paw" size={20} /><Text style={s.detailText}>{petLabel(request)}</Text></View>
    {request.durationMinutes !== null && <Text style={s.petDetail}>Duración: {request.durationMinutes} minutos</Text>}
    {request.observations ? <View><Text style={s.fieldLabel}>Observaciones</Text><Text numberOfLines={4} style={s.detailText}>{request.observations}</Text></View> : null}
    {request.status === 'PENDING' && <Pressable accessibilityRole="button" accessibilityLabel={`Aceptar paseo de ${request.ownerName || 'este dueño'}`} accessibilityState={{ disabled: disabled || execution.operation.busy, busy }}
      disabled={disabled || execution.operation.busy} onPress={() => perform('accept', request.id)} style={[s.button, s.primary, (disabled || execution.operation.busy) && s.muted]}>
      {busy && <ActivityIndicator color={colors.white} />}<Text style={s.primaryText}>{busy ? 'Aceptando…' : 'Aceptar paseo'}</Text>
    </Pressable>}
  </View>;
}
function WalkGpsStatus({ walkId, disabled }: { walkId: string; disabled: boolean }) {
  const gps = useGpsSharing();
  return <View style={{ gap: 10 }}>
    <Text style={s.notice}>{gps.state.sharing && gps.state.walkId === walkId ? 'GPS activo: compartiendo ubicación con el dueño.' : 'El GPS no está compartiendo la ubicación de este paseo.'}</Text>
    {gps.state.message && <Text style={s.notice}>{gps.state.message}</Text>}
    {(!gps.state.sharing || gps.state.walkId !== walkId) && <Pressable accessibilityRole="button" disabled={gps.busy || disabled} onPress={() => { void gps.resume(walkId); }} style={s.textLink}>
      <Text style={s.textLinkLabel}>{gps.busy ? 'Activando GPS…' : 'Compartir ubicación'}</Text>
    </Pressable>}
  </View>;
}
export function WalkerWalkCard({ walk, execution, disabled, perform }: { walk: WalkerWalkSummary } & WalkerCardActions) {
  const action = walk.status === 'SCHEDULED' ? 'start' : walk.status === 'IN_PROGRESS' ? 'complete' : null;
  const busy = execution.operation.busy && execution.operation.id === walk.id && execution.operation.action === action;
  return <View style={s.surface}>
    <View style={s.walkHeader}><View style={s.iconTile}><Icon name="calendar" size={20} /></View><View style={[s.badge, walk.status === 'IN_PROGRESS' && s.badgeActive]}><Text style={s.badgeText}>{walkStatus[walk.status]}</Text></View></View>
    <Text style={s.walkDate}>{dateLabel(walk.scheduledAt)}</Text>
    <View style={s.detailLine}><Icon name="paw" size={20} /><Text style={s.detailText}>{petLabel(walk)}</Text></View>
    {walk.durationMinutes !== null && <Text style={s.walkTime}>{walk.durationMinutes} minutos</Text>}
    {!!walk.observations && <View><Text style={s.fieldLabel}>Indicaciones del paseo</Text><Text style={s.detailText}>{walk.observations}</Text></View>}
    <WalkTiming walk={walk} variant="walker" />
    {walk.status === 'SCHEDULED' && <Text style={s.notice}>Al iniciar, permití la ubicación precisa mientras usás Mascotas. En Android, mantené la app abierta hasta que aparezca la notificación de seguimiento; después podés usar otras aplicaciones.</Text>}
    {walk.status === 'IN_PROGRESS' && <WalkGpsStatus walkId={walk.id} disabled={execution.operation.busy} />}
    {action && <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || execution.operation.busy, busy }} disabled={disabled || execution.operation.busy}
      onPress={() => perform(action, walk.id)} style={[s.button, s.primary, (disabled || execution.operation.busy) && s.muted]}>
      {busy && <ActivityIndicator color={colors.white} />}<Text style={s.primaryText}>{busy ? 'Guardando…' : action === 'start' ? 'Iniciar paseo' : 'Finalizar paseo'}</Text>
    </Pressable>}
  </View>;
}

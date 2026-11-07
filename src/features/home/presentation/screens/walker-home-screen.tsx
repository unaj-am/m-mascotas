import { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, useWindowDimensions, View } from 'react-native';
import { FormMessage } from '../../../../core/ui/auth-card';
import type { WalkerDashboard, WalkerRequestSummary, WalkerWalkSummary } from '../../../../core/domain/entities/walker-dashboard';
import { summarizeWalkerDashboard } from '../../../../core/domain/entities/walker-dashboard';
import { useWalkerDashboard } from '../hooks/use-walker-dashboard';
import { DashboardAvatar, DashboardShell, type DashboardTab } from '../components/dashboard-shell';
import { DashboardIcon, type DashboardIconName } from '../components/dashboard-icon';
import { colors, styles as s } from './walker-home.styles';

type Tab = 'home' | 'requests' | 'agenda' | 'profile';
type AgendaFilter = 'scheduled' | 'active' | 'history';
const tabs: readonly DashboardTab<Tab>[] = [
  { id: 'home', label: 'Inicio', icon: 'home' }, { id: 'requests', label: 'Solicitudes', icon: 'inbox' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' }, { id: 'profile', label: 'Perfil', icon: 'user' },
];
const requestStatus = { PENDING: 'Pendiente', ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada' };
const walkStatus = { SCHEDULED: 'Programado', IN_PROGRESS: 'En curso', COMPLETED: 'Completado', CANCELLED: 'Cancelado' };
const dateLabel = (value: number | null) => value === null ? 'Fecha a confirmar' : new Date(value).toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
function petLabel(item: Pick<WalkerRequestSummary, 'petIds' | 'petNames'>) {
  const extra = Math.max(0, item.petIds.length - item.petNames.length);
  if (item.petNames.length) return `${item.petNames.join(', ')}${extra ? ` y ${extra} mascota${extra === 1 ? '' : 's'} más` : ''}`;
  return item.petIds.length ? `${item.petIds.length} mascota${item.petIds.length === 1 ? '' : 's'}` : 'Mascotas a confirmar';
}
function Icon({ name, size = 22 }: { name: DashboardIconName; size?: number }) {
  return <DashboardIcon name={name} size={size} color={colors.primary} />;
}
function EmptyState({ title, description, icon }: { title: string; description: string; icon: DashboardIconName }) {
  return <View style={[s.surface, s.empty]}><View style={s.emptyIcon}><Icon name={icon} size={30} /></View>
    <Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyDescription}>{description}</Text>
  </View>;
}
function RequestCard({ request }: { request: WalkerRequestSummary }) {
  return <View style={s.surface}>
    <View style={s.walkHeader}><Text style={s.requestTitle}>{request.ownerName || 'Solicitud de paseo'}</Text><View style={s.badge}><Text style={s.badgeText}>{requestStatus[request.status]}</Text></View></View>
    <View style={s.detailLine}><Icon name="calendar" size={20} /><View style={{ flex: 1 }}><Text style={s.fieldLabel}>Fecha y hora</Text><Text style={s.detailText}>{dateLabel(request.scheduledAt)}</Text></View></View>
    <View style={s.detailLine}><Icon name="paw" size={20} /><Text style={s.detailText}>{petLabel(request)}</Text></View>
    {request.durationMinutes !== null && <Text style={s.petDetail}>Duración: {request.durationMinutes} minutos</Text>}
    {request.observations ? <View><Text style={s.fieldLabel}>Observaciones</Text><Text numberOfLines={4} style={s.detailText}>{request.observations}</Text></View> : null}
  </View>;
}
function WalkCard({ walk }: { walk: WalkerWalkSummary }) {
  return <View style={s.surface}>
    <View style={s.walkHeader}><View style={s.iconTile}><Icon name="calendar" size={20} /></View><View style={[s.badge, walk.status === 'IN_PROGRESS' && s.badgeActive]}><Text style={s.badgeText}>{walkStatus[walk.status]}</Text></View></View>
    <Text style={s.walkDate}>{dateLabel(walk.scheduledAt)}</Text>
    <View style={s.detailLine}><Icon name="paw" size={20} /><Text style={s.detailText}>{petLabel(walk)}</Text></View>
    {walk.durationMinutes !== null && <Text style={s.walkTime}>{walk.durationMinutes} minutos</Text>}
  </View>;
}
function AvailabilityCard({ data, busy, onChange }: { data: WalkerDashboard; busy: boolean; onChange: (value: boolean) => void }) {
  const description = !data.hasWalkerProfile ? 'Primero necesitás completar tu perfil profesional para activar la disponibilidad.'
    : busy ? 'Actualizando tu disponibilidad…' : data.available ? 'Podés recibir nuevas solicitudes de paseo.' : 'No recibirás nuevas solicitudes mientras estés desconectado.';
  return <View style={s.surface}>
    <View style={s.availabilityHeading}><Text style={s.sectionTitle}>Tu disponibilidad</Text><View style={s.badge}>
      <Text style={s.badgeText}>{busy ? 'Actualizando' : data.available ? 'Disponible' : 'No disponible'}</Text>
    </View></View>
    <View style={s.availabilityRow}>
      <View style={{ flex: 1 }}><Text style={s.availabilityTitle}>{data.available ? 'Estoy disponible' : 'Estoy desconectado'}</Text><Text style={s.availabilityDetail}>{description}</Text></View>
      {busy && <ActivityIndicator color={colors.primary} size="small" />}
      <Switch accessibilityLabel="Disponibilidad para recibir solicitudes" value={data.available} onValueChange={onChange}
        disabled={busy || !data.hasWalkerProfile} trackColor={{ false: '#dce3dc', true: colors.primary }} thumbColor={colors.white} />
    </View>
  </View>;
}
function HomeContent({ data, compact, busy, onAvailabilityChange, navigate }: {
  data: WalkerDashboard; compact: boolean; busy: boolean; onAvailabilityChange: (value: boolean) => void; navigate: (tab: Tab, filter?: AgendaFilter) => void;
}) {
  const summary = summarizeWalkerDashboard(data);
  const stats: readonly { title: string; value: string; tab: Tab; icon: DashboardIconName; rating?: boolean; filter?: AgendaFilter }[] = [
    { title: 'Solicitudes pendientes', value: String(summary.pendingCount), tab: 'requests', icon: 'inbox' },
    { title: 'Paseos programados', value: String(summary.scheduledCount), tab: 'agenda', icon: 'calendar', filter: 'scheduled' },
    { title: 'Paseos en curso', value: String(summary.activeCount), tab: 'agenda', icon: 'paw', filter: 'active' },
    { title: 'Calificación promedio', value: data.rating === null ? 'Sin calificar' : `${data.rating.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5`, tab: 'profile', icon: 'check', rating: true },
  ];
  return <>
    <AvailabilityCard data={data} busy={busy} onChange={onAvailabilityChange} />
    <View><Text accessibilityRole="header" style={s.sectionTitle}>Resumen de actividad</Text><Text style={s.subtitle}>Consultá el estado de tus paseos y solicitudes</Text></View>
    <View style={s.statRows}>{[stats.slice(0, 2), stats.slice(2, 4)].map((row, index) => <View key={index} style={s.stats}>{row.map((stat) =>
      <Pressable key={stat.title} accessibilityRole="button" accessibilityLabel={`${stat.title}: ${stat.value}. Ver detalle`} onPress={() => navigate(stat.tab, stat.filter)} style={({ pressed }) => [s.stat, compact && s.statCompact, pressed && s.muted]}>
        <View style={s.iconTile}><Icon name={stat.icon} size={21} /></View><Text style={[s.number, stat.rating && s.rating]}>{stat.value}</Text><Text style={s.statLabel}>{stat.title}</Text>
      </Pressable>)}</View>)}</View>
    <View style={s.sectionTop}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={s.sectionTitle}>Solicitudes pendientes</Text>
      <Text style={s.subtitle}>{summary.pendingCount ? `${summary.pendingCount} solicitudes para revisar` : 'No tenés solicitudes nuevas'}</Text></View>
      {summary.pendingCount > 0 && <Pressable accessibilityRole="button" onPress={() => navigate('requests')} style={s.textLink}><Text style={s.textLinkLabel}>Ver todas</Text><Icon name="arrow" size={17} /></Pressable>}
    </View>
    {summary.pending.length ? summary.pending.slice(0, 3).map((request) => <RequestCard key={request.id} request={request} />)
      : <EmptyState icon="inbox" title="Todo al día" description="Cuando recibas nuevas solicitudes de paseo, aparecerán acá." />}
  </>;
}
function RequestsContent({ requests }: { requests: readonly WalkerRequestSummary[] }) {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const visible = requests.filter((request) => filter === 'all' || request.status === 'PENDING');
  return <>
    <View style={s.filters}>{([{ id: 'pending', label: 'Pendientes' }, { id: 'all', label: 'Todas' }] as const).map((item) =>
      <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: filter === item.id }} onPress={() => setFilter(item.id)} style={[s.filter, filter === item.id && s.filterActive]}>
        <Text style={[s.filterText, filter === item.id && s.filterTextActive]}>{item.label}</Text>
      </Pressable>)}</View>
    {visible.length ? visible.map((request) => <RequestCard key={request.id} request={request} />)
      : <EmptyState icon="inbox" title="Todo al día" description="No tenés solicitudes en esta categoría." />}
    <Text style={s.notice}>La aceptación y el rechazo de solicitudes estarán disponibles próximamente.</Text>
  </>;
}
function AgendaContent({ walks, filter, setFilter }: { walks: readonly WalkerWalkSummary[]; filter: AgendaFilter; setFilter: (filter: AgendaFilter) => void }) {
  const visible = walks.filter((walk) => filter === 'scheduled' ? walk.status === 'SCHEDULED' : filter === 'active' ? walk.status === 'IN_PROGRESS' : ['COMPLETED', 'CANCELLED'].includes(walk.status));
  return <>
    <View style={s.filters}>{([{ id: 'scheduled', label: 'Programados' }, { id: 'active', label: 'En curso' }, { id: 'history', label: 'Historial' }] as const).map((item) =>
      <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: filter === item.id }} onPress={() => setFilter(item.id)} style={[s.filter, filter === item.id && s.filterActive]}>
        <Text style={[s.filterText, filter === item.id && s.filterTextActive]}>{item.label}</Text>
      </Pressable>)}</View>
    {visible.length ? visible.map((walk) => <WalkCard key={walk.id} walk={walk} />)
      : <EmptyState icon="calendar" title="Sin paseos para mostrar" description="Los paseos de esta categoría aparecerán en tu agenda cuando estén disponibles." />}
    <Text style={s.notice}>El inicio, seguimiento y finalización de paseos estarán disponibles próximamente.</Text>
  </>;
}
function ProfileContent({ data }: { data: WalkerDashboard }) {
  return <>
    <View style={s.surface}><View style={s.profileHeader}><DashboardAvatar name={data.name} uri={data.profileImage} variant="walker" />
      <View style={{ flex: 1 }}><Text style={s.sectionTitle}>{`${data.name} ${data.lastName}`.trim() || 'Mi perfil'}</Text><Text style={s.petDetail}>Cuenta de paseador</Text></View>
    </View><View style={s.divider} />
      {[['Correo electrónico', data.email], ['Teléfono', data.phone]].map(([label, value]) => <View key={label}><Text style={s.fieldLabel}>{label}</Text><Text selectable style={s.fieldValue}>{value || 'Sin informar'}</Text></View>)}
    </View>
    <View style={s.surface}><Text style={s.sectionTitle}>Mi perfil profesional</Text>
      {data.hasWalkerProfile ? <>
        {[['Zona de servicio', data.serviceArea || 'Sin definir'], ['Descripción', data.description || 'Sin informar'],
          ['Precio por paseo', data.pricePerWalk === null ? 'Sin definir' : data.pricePerWalk.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })],
          ['Calificación', data.rating === null ? 'Sin calificar' : `${data.rating.toLocaleString('es-AR', { maximumFractionDigits: 1 })} / 5`]].map(([label, value]) =>
          <View key={label}><Text style={s.fieldLabel}>{label}</Text><Text style={s.fieldValue}>{value}</Text></View>)}
      </> : <Text style={s.notice}>Tu cuenta todavía no tiene un perfil profesional. No podés activar la disponibilidad hasta completarlo.</Text>}
      <Text style={s.notice}>La creación y edición del perfil profesional estarán disponibles próximamente.</Text>
    </View>
  </>;
}

export function WalkerHomeScreen() {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('home');
  const [agendaFilter, setAgendaFilter] = useState<AgendaFilter>('scheduled');
  function navigate(next: Tab, filter?: AgendaFilter) { setTab(next); if (filter) setAgendaFilter(filter); }
  const { state, reload, changeAvailability, availability } = useWalkerDashboard();
  const data = state.status === 'ready' ? state.data : null;
  const title = tab === 'home' ? `Hola, ${data?.name || 'paseador'}` : tab === 'requests' ? 'Mis solicitudes' : tab === 'agenda' ? 'Mi agenda' : 'Mi perfil';
  const subtitle = { home: 'Este es el resumen de tu actividad.', requests: 'Revisá las solicitudes de paseo que recibiste.', agenda: 'Organizá tus paseos y consultá tu historial.', profile: 'Tus datos de contacto y tu perfil profesional.' }[tab];
  return <DashboardShell variant="walker" tabs={tabs} activeTab={tab} onTabChange={setTab} name={data?.name || ''}
    profileImage={data?.profileImage ?? null} title={title} subtitle={subtitle} loading={state.status === 'loading'}
    refreshDisabled={availability.busy} onRefresh={() => { void reload(); }}>
    {state.status === 'loading' && <View style={[s.surface, s.busySurface]}><ActivityIndicator color={colors.primary} /><Text accessibilityLiveRegion="polite" style={s.busyText}>Cargando tu actividad…</Text></View>}
    {state.status === 'error' && <View style={s.surface}><Text style={s.emptyTitleLeft}>No pudimos cargar tu inicio</Text><Text style={s.subtitle}>{state.message}</Text>
      <Pressable accessibilityRole="button" onPress={() => { void reload(); }} style={[s.button, s.primary]}><Text style={s.primaryText}>Volver a intentar</Text></Pressable>
    </View>}
    {availability.message && <View style={availability.error ? s.error : s.feedback}><FormMessage message={availability.message} error={availability.error} /></View>}
    {data && (tab === 'home' ? <HomeContent data={data} compact={width < 760} busy={availability.busy} onAvailabilityChange={(value) => { void changeAvailability(value); }} navigate={navigate} />
      : tab === 'requests' ? <RequestsContent requests={data.requests} /> : tab === 'agenda' ? <AgendaContent walks={data.walks} filter={agendaFilter} setFilter={setAgendaFilter} /> : <ProfileContent data={data} />)}
  </DashboardShell>;
}

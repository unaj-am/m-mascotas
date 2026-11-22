import { useState } from 'react';
import type { WalkerDashboard, WalkerRequestSummary, WalkerWalkSummary } from '../../../../core/domain/entities/walker-dashboard';
import { summarizeWalkerDashboard } from '../../../../core/domain/entities/walker-dashboard';
import { DashboardAvatar } from '../../../../core/ui/dashboard-avatar';
import { DashboardIcon, type DashboardIconName } from '../../../../core/ui/dashboard-icon';
import { colors, styles as s } from '../screens/walker-home.styles';

import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';

import { WalkerRequestCard, WalkerWalkCard, type WalkerCardActions } from './walker-activity-cards';

export type Tab = 'home' | 'requests' | 'agenda' | 'profile';
export type AgendaFilter = 'scheduled' | 'active' | 'history';

function EmptyState({ title, description, icon }: { title: string; description: string; icon: DashboardIconName }) {
  return <View style={[s.surface, s.empty]}><View style={s.emptyIcon}><DashboardIcon name={icon} size={30} color={colors.primary} /></View>
    <Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyDescription}>{description}</Text>
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
export function WalkerHomeContent({ data, compact, busy, onAvailabilityChange, navigate, execution, disabled, perform }: {
  data: WalkerDashboard; compact: boolean; busy: boolean; onAvailabilityChange: (value: boolean) => void; navigate: (tab: Tab, filter?: AgendaFilter) => void;
} & WalkerCardActions) {
  const summary = summarizeWalkerDashboard(data);
  const stats: readonly { title: string; value: string; tab: Tab; icon: DashboardIconName; filter?: AgendaFilter }[] = [
    { title: 'Solicitudes pendientes', value: String(summary.pendingCount), tab: 'requests', icon: 'inbox' },
    { title: 'Paseos programados', value: String(summary.scheduledCount), tab: 'agenda', icon: 'calendar', filter: 'scheduled' },
    { title: 'Paseos en curso', value: String(summary.activeCount), tab: 'agenda', icon: 'paw', filter: 'active' },
  ];
  return <>
    <AvailabilityCard data={data} busy={busy} onChange={onAvailabilityChange} />
    <View><Text accessibilityRole="header" style={s.sectionTitle}>Resumen de actividad</Text><Text style={s.subtitle}>Consultá el estado de tus paseos y solicitudes</Text></View>
    <View style={s.statRows}>{[stats.slice(0, 2), stats.slice(2, 4)].map((row, index) => <View key={index} style={s.stats}>{row.map((stat) =>
      <Pressable key={stat.title} accessibilityRole="button" accessibilityLabel={`${stat.title}: ${stat.value}. Ver detalle`} onPress={() => navigate(stat.tab, stat.filter)} style={({ pressed }) => [s.stat, compact && s.statCompact, pressed && s.muted]}>
        <View style={s.iconTile}><DashboardIcon name={stat.icon} size={21} color={colors.primary} /></View><Text style={s.number}>{stat.value}</Text><Text style={s.statLabel}>{stat.title}</Text>
      </Pressable>)}</View>)}</View>
    <View style={s.sectionTop}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={s.sectionTitle}>Solicitudes pendientes</Text>
      <Text style={s.subtitle}>{summary.pendingCount ? `${summary.pendingCount} solicitudes para revisar` : 'No tenés solicitudes nuevas'}</Text></View>
      {summary.pendingCount > 0 && <Pressable accessibilityRole="button" onPress={() => navigate('requests')} style={s.textLink}><Text style={s.textLinkLabel}>Ver todas</Text><DashboardIcon name="arrow" size={17} color={colors.primary} /></Pressable>}
    </View>
    {summary.pending.length ? summary.pending.slice(0, 3).map((request) => <WalkerRequestCard key={request.id} request={request} execution={execution} disabled={disabled} perform={perform} />)
      : <EmptyState icon="inbox" title="Todo al día" description="Cuando recibas nuevas solicitudes de paseo, aparecerán acá." />}
  </>;
}
export function WalkerRequestsContent({ requests, execution, disabled, perform }: { requests: readonly WalkerRequestSummary[] } & WalkerCardActions) {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const visible = requests.filter((request) => filter === 'all' || request.status === 'PENDING');
  return <>
    <View style={s.filters}>{([{ id: 'pending', label: 'Pendientes' }, { id: 'all', label: 'Todas' }] as const).map((item) =>
      <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: filter === item.id }} onPress={() => setFilter(item.id)} style={[s.filter, filter === item.id && s.filterActive]}>
        <Text style={[s.filterText, filter === item.id && s.filterTextActive]}>{item.label}</Text>
      </Pressable>)}</View>
    {visible.length ? visible.map((request) => <WalkerRequestCard key={request.id} request={request} execution={execution} disabled={disabled} perform={perform} />)
      : <EmptyState icon="inbox" title="Todo al día" description="No tenés solicitudes en esta categoría." />}
    <Text style={s.notice}>Al aceptar una solicitud, el paseo aparece en tu agenda como programado.</Text>
  </>;
}
export function WalkerAgendaContent({ walks, filter, setFilter, execution, disabled, perform }: { walks: readonly WalkerWalkSummary[]; filter: AgendaFilter; setFilter: (filter: AgendaFilter) => void } & WalkerCardActions) {
  const visible = walks.filter((walk) => filter === 'scheduled' ? walk.status === 'SCHEDULED' : filter === 'active' ? walk.status === 'IN_PROGRESS' : ['COMPLETED', 'CANCELLED'].includes(walk.status));
  return <>
    <View style={s.filters}>{([{ id: 'scheduled', label: 'Programados' }, { id: 'active', label: 'En curso' }, { id: 'history', label: 'Historial' }] as const).map((item) =>
      <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: filter === item.id }} onPress={() => setFilter(item.id)} style={[s.filter, filter === item.id && s.filterActive]}>
        <Text style={[s.filterText, filter === item.id && s.filterTextActive]}>{item.label}</Text>
      </Pressable>)}</View>
    {visible.length ? visible.map((walk) => <WalkerWalkCard key={walk.id} walk={walk} execution={execution} disabled={disabled} perform={perform} />)
      : <EmptyState icon="calendar" title="Sin paseos para mostrar" description="Los paseos de esta categoría aparecerán en tu agenda cuando estén disponibles." />}
    <Text style={s.notice}>Los paseos finalizados quedan guardados en el historial.</Text>
  </>;
}
export function WalkerProfileContent({ data }: { data: WalkerDashboard }) {
  return <>
    <View style={s.surface}><View style={s.profileHeader}><DashboardAvatar name={data.name} uri={data.profileImage} variant="walker" />
      <View style={{ flex: 1 }}><Text style={s.sectionTitle}>{`${data.name} ${data.lastName}`.trim() || 'Mi perfil'}</Text><Text style={s.petDetail}>Cuenta de paseador</Text></View>
    </View><View style={s.divider} />
      {[['Correo electrónico', data.email], ['Teléfono', data.phone]].map(([label, value]) => <View key={label}><Text style={s.fieldLabel}>{label}</Text><Text selectable style={s.fieldValue}>{value || 'Sin informar'}</Text></View>)}
    </View>
    <View style={s.surface}><Text style={s.sectionTitle}>Mi perfil profesional</Text>
      {data.hasWalkerProfile ? <>
        {[['Zona de servicio', data.serviceArea || 'Sin definir'], ['Descripción', data.description || 'Sin informar'],
          ['Precio por paseo', data.pricePerWalk === null ? 'Sin definir' : data.pricePerWalk.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })]].map(([label, value]) =>
          <View key={label}><Text style={s.fieldLabel}>{label}</Text><Text style={s.fieldValue}>{value}</Text></View>)}
      </> : <Text style={s.notice}>Tu cuenta todavía no tiene un perfil profesional. No podés activar la disponibilidad hasta completarlo.</Text>}
    </View>
  </>;
}

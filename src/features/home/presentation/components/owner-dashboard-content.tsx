import { DashboardAvatar } from '../../../../core/ui/dashboard-avatar';
import { summarizeOwnerDashboard, type OwnerDashboard, type OwnerPetSummary, type OwnerWalkSummary } from '../../../../core/domain/entities/owner-dashboard';
import { DashboardIcon, type DashboardIconName } from '../../../../core/ui/dashboard-icon';
import { colors, styles as s } from '../screens/owner-home.styles';
import type { BookingRequests } from '../../../walks/presentation/hooks/use-booking-requests';
import { BookingRequestList } from '../../../walks/presentation/components/booking-request-list';
import { WalkTiming } from '../../../walks/presentation/components/walk-timing';
import { walkStatusLabels as statusLabel } from '../../../walks/presentation/state/walk-display';
import { ownerWalkFilters, selectOwnerWalks, type OwnerWalkFilter } from '../../../walks/presentation/state/owner-walks-state';

import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

export type Tab = 'home' | 'pets' | 'walks' | 'profile' | 'walkers' | 'tracking';

const petNames = (walk: OwnerWalkSummary, pets: readonly OwnerPetSummary[]) => walk.petIds.map((id) => pets.find((pet) => pet.id === id)?.name ?? 'Mascota').join(', ') || 'Paseo de mascotas';
const dateLabel = (value: number | null) => value === null ? 'Fecha a confirmar' : new Date(value).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
const timeLabel = (value: number | null) => value === null ? null : new Date(value).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

function TextLink({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.textLink, pressed && s.muted]}>
    <Text style={s.textLinkLabel}>{title}</Text><DashboardIcon name="arrow" size={16} />
  </Pressable>;
}
export function OwnerEmptyState({ icon, title, description }: { icon: DashboardIconName; title: string; description: string }) {
  return <View style={s.empty}>
    <View style={s.emptyIcon}><DashboardIcon name={icon} size={30} color={colors.primary} /></View>
    <Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyDescription}>{description}</Text>
  </View>;
}
function WalkCard({ walk, pets, onTrack }: { walk: OwnerWalkSummary; pets: readonly OwnerPetSummary[]; onTrack: (id: string) => void }) {
  return <View style={s.surface}>
    <View style={s.walkHeader}>
      <Text style={[s.petName, { flex: 1 }]}>{petNames(walk, pets)}</Text>
      <View style={[s.badge, walk.status === 'IN_PROGRESS' && s.badgeActive]}><Text style={s.badgeText}>{statusLabel[walk.status]}</Text></View>
    </View>
    <View><Text style={s.walkDate}>{dateLabel(walk.scheduledAt)}</Text>
      <Text style={s.walkTime}>{[timeLabel(walk.scheduledAt), walk.durationMinutes !== null ? `${walk.durationMinutes} minutos` : null].filter(Boolean).join(' · ') || 'Horario a confirmar'}</Text></View>
    <View style={s.divider} />
    <View style={s.detailLine}><DashboardIcon name="paw" size={18} /><Text style={s.detailText}>{petNames(walk, pets)}</Text></View>
    <WalkTiming walk={walk} variant="owner" />
    {walk.status !== 'CANCELLED' && <Pressable accessibilityRole="button" onPress={() => onTrack(walk.id)} style={[s.button, s.primary]}><Text style={s.primaryText}>{walk.status === 'COMPLETED' ? 'Ver recorrido' : 'Ver seguimiento'}</Text></Pressable>}
  </View>;
}
export function OwnerHomeContent({ data, compact, navigate, onSearch, onTrack }: { data: OwnerDashboard; compact: boolean; navigate: (tab: Tab) => void; onSearch: () => void; onTrack: (id: string) => void }) {
  const summary = summarizeOwnerDashboard(data);
  const next = summary.nextWalk;
  const nextPet = next ? data.pets.find((pet) => next.petIds.includes(pet.id)) : null;
  const stats: { title: string; value: number; icon: DashboardIconName; tab: Tab }[] = [
    { title: 'Próximos paseos', value: summary.upcomingCount, icon: 'calendar', tab: 'walks' },
    { title: 'Mis mascotas', value: summary.petsCount, icon: 'paw', tab: 'pets' },
  ];
  return <>
    <View><Text accessibilityRole="header" style={s.sectionTitle}>Tu actividad</Text>
      <Text style={s.subtitle}>Un resumen de tus mascotas y paseos</Text></View>
    <View style={s.stats}>
      {stats.map((stat) => <Pressable key={stat.title} accessibilityRole="button" accessibilityLabel={`${stat.title}: ${stat.value}. Ver detalle`}
        onPress={() => navigate(stat.tab)} style={({ pressed }) => [s.stat, compact && s.statCompact, pressed && s.muted]}>
        <View style={s.iconTile}><DashboardIcon name={stat.icon} size={22} /></View>
        <Text style={s.number}>{stat.value}</Text><Text style={s.statLabel}>{stat.title}</Text>
      </Pressable>)}
    </View>
    <View><Text accessibilityRole="header" style={s.sectionTitle}>Próximo paseo</Text>
      <Text style={s.subtitle}>Organizá las próximas aventuras de tu mascota</Text></View>
    <View style={s.surface}>
      <View style={s.walkHeader}><View style={[s.iconTile, { width: 48, height: 48, borderRadius: 12 }]}><DashboardIcon name={next ? 'calendar' : 'paw'} size={25} /></View>
        <View style={s.badge}><Text style={s.badgeText}>{next ? statusLabel[next.status] : 'Sin paseos'}</Text></View></View>
      {next ? <>
        <View><Text style={s.walkDate}>{petNames(next, data.pets)}</Text>{nextPet?.breed ? <Text style={s.subtitle}>{nextPet.breed}</Text> : null}</View>
        <View style={s.detailLine}><DashboardIcon name="calendar" size={22} /><View>
          <Text style={s.fieldLabel}>Fecha y horario</Text><Text style={s.detailText}>{[dateLabel(next.scheduledAt), timeLabel(next.scheduledAt)].filter(Boolean).join(' · ')}</Text>
        </View></View>
        <TextLink title="Ver mis paseos" onPress={() => navigate('walks')} />
        <Pressable accessibilityRole="button" onPress={() => onTrack(next.id)} style={[s.button, s.primary]}><Text style={s.primaryText}>Ver seguimiento</Text></Pressable>
      </> : <View><Text style={s.emptyTitleLeft}>Todavía no tenés paseos programados</Text>
        <Text style={s.subtitle}>Encontrá un paseador de confianza y organizá el próximo paseo de tu mascota.</Text></View>}
      <Pressable accessibilityRole="button" onPress={onSearch} style={[s.button, s.primary]} accessibilityLabel="Buscar paseador">
        <Text style={s.primaryText}>{next ? 'Buscar otro paseador' : 'Buscar paseador'}</Text>
      </Pressable>
    </View>
  </>;
}
export function OwnerWalksContent({ walks, requests, pets, onTrack, filter, setFilter }: { walks: readonly OwnerWalkSummary[]; requests: BookingRequests; pets: readonly OwnerPetSummary[]; onTrack: (id: string) => void; filter: OwnerWalkFilter; setFilter: (filter: OwnerWalkFilter) => void }) {
  if (requests.state.status === 'loading') return <View style={s.surface}><ActivityIndicator color={colors.primary} /><Text style={s.notice}>Cargando tus paseos…</Text></View>;
  if (requests.state.status === 'error') return <View style={s.surface}><Text accessibilityRole="alert" style={s.notice}>{requests.state.message}</Text><Pressable accessibilityRole="button" onPress={requests.retry} style={s.textLink}><Text style={s.textLinkLabel}>Volver a intentar</Text></Pressable></View>;
  const selected = selectOwnerWalks(walks, requests.state.data.items, filter);
  const hasResults = selected.requests.length + selected.upcoming.length + selected.history.length > 0;
  return <>
    {(requests.state.data.fromCache || requests.state.data.pendingWrites) && <Text style={s.notice}>{requests.state.data.pendingWrites ? 'Hay cambios pendientes de confirmación.' : 'Mostrando una copia guardada. Se actualizará al conectar con el servidor.'}</Text>}
    {selected.counts.ALL > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
      {ownerWalkFilters.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: filter === item.id }} onPress={() => setFilter(item.id)} style={[s.filter, { borderRadius: 8 }, filter === item.id && s.filterActive]}>
        <Text style={[s.filterText, filter === item.id && s.filterTextActive]}>{item.label} ({selected.counts[item.id]})</Text>
      </Pressable>)}
    </ScrollView>}
    <BookingRequestList items={selected.requests} />
    {selected.upcoming.length > 0 && <>
      <View><Text accessibilityRole="header" style={s.sectionTitle}>Próximos y en curso</Text><Text style={s.subtitle}>Tus paseos confirmados y los que están activos.</Text></View>
      {selected.upcoming.map((walk) => <WalkCard key={walk.id} walk={walk} pets={pets} onTrack={onTrack} />)}
    </>}
    {selected.history.length > 0 && <>
      <View><Text accessibilityRole="header" style={s.sectionTitle}>Historial</Text><Text style={s.subtitle}>Paseos finalizados o cancelados.</Text></View>
      {selected.history.map((walk) => <WalkCard key={walk.id} walk={walk} pets={pets} onTrack={onTrack} />)}
    </>}
    {!hasResults && <View style={s.surface}>
      <OwnerEmptyState icon="calendar" title={selected.counts.ALL === 0 ? 'Todavía no tenés paseos' : 'No hay resultados'} description={selected.counts.ALL === 0 ? 'Buscá un paseador y enviá una solicitud para organizar tu primer paseo.' : `No tenés elementos que coincidan con el filtro ${ownerWalkFilters.find((item) => item.id === filter)?.label.toLowerCase()}.`} />
    </View>}
  </>;
}
export function OwnerProfileContent({ data }: { data: OwnerDashboard }) {
  return <View style={s.surface}>
    <View style={s.profileHeader}><DashboardAvatar variant="owner" name={data.name} uri={data.profileImage ?? null} />
      <View style={{ flex: 1 }}><Text style={s.sectionTitle}>{`${data.name} ${data.lastName}`.trim() || 'Mi cuenta'}</Text><Text style={s.petDetail}>Cuenta de dueño</Text></View>
    </View><View style={s.divider} />
    {[['Correo electrónico', data.email], ['Teléfono', data.phone]].map(([label, value]) => <View key={label}>
      <Text style={s.fieldLabel}>{label}</Text><Text selectable style={s.fieldValue}>{value || 'Sin informar'}</Text>
    </View>)}
  </View>;
}

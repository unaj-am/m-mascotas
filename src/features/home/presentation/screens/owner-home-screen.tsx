import { DashboardShell, DashboardAvatar } from '../components/dashboard-shell';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { summarizeOwnerDashboard, type OwnerDashboard, type OwnerPetSummary, type OwnerWalkSummary } from '../../../../core/domain/entities/owner-dashboard';
import { useOwnerDashboard } from '../hooks/use-owner-dashboard';
import { DashboardIcon, type DashboardIconName } from '../components/dashboard-icon';
import { colors, styles as s } from './owner-home.styles';
import { usePets } from '../../../pets/presentation/hooks/use-pets';
import { PetsScreen } from '../../../pets/presentation/screens/pets-screen';
import { WalkerSearchScreen } from '../../../walkers/presentation/screens/walker-search-screen';
import { useBookingRequests } from '../../../walks/presentation/hooks/use-booking-requests';
import { BookingRequestList } from '../../../walks/presentation/components/booking-request-list';
import { useWalks } from '../../../walks/presentation/hooks/use-walks';
import { WalkTiming } from '../../../walks/presentation/components/walk-timing';

type Tab = 'home' | 'pets' | 'walks' | 'profile' | 'walkers';
const tabs: readonly { id: Tab; label: string; icon: DashboardIconName }[] = [
  { id: 'home', label: 'Inicio', icon: 'home' }, { id: 'pets', label: 'Mascotas', icon: 'paw' },
  { id: 'walks', label: 'Paseos', icon: 'calendar' }, { id: 'profile', label: 'Perfil', icon: 'user' },
];
const statusLabel = { SCHEDULED: 'Programado', IN_PROGRESS: 'En curso', COMPLETED: 'Completado', CANCELLED: 'Cancelado' };
const petNames = (walk: OwnerWalkSummary, pets: readonly OwnerPetSummary[]) => walk.petIds.map((id) => pets.find((pet) => pet.id === id)?.name ?? 'Mascota').join(', ') || 'Paseo de mascotas';
const dateLabel = (value: number | null) => value === null ? 'Fecha a confirmar' : new Date(value).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
const timeLabel = (value: number | null) => value === null ? null : new Date(value).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

function TextLink({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.textLink, pressed && s.muted]}>
    <Text style={s.textLinkLabel}>{title}</Text><DashboardIcon name="arrow" size={16} />
  </Pressable>;
}
function EmptyState({ icon, title, description }: { icon: DashboardIconName; title: string; description: string }) {
  return <View style={s.empty}>
    <View style={s.emptyIcon}><DashboardIcon name={icon} size={30} color={colors.primary} /></View>
    <Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyDescription}>{description}</Text>
  </View>;
}
function WalkCard({ walk, pets }: { walk: OwnerWalkSummary; pets: readonly OwnerPetSummary[] }) {
  return <View style={s.surface}>
    <View style={s.walkHeader}>
      <View style={s.iconTile}><DashboardIcon name="calendar" size={20} /></View>
      <View style={[s.badge, walk.status === 'IN_PROGRESS' && s.badgeActive]}><Text style={s.badgeText}>{statusLabel[walk.status]}</Text></View>
    </View>
    <View><Text style={s.walkDate}>{dateLabel(walk.scheduledAt)}</Text>
      <Text style={s.walkTime}>{[timeLabel(walk.scheduledAt), walk.durationMinutes !== null ? `${walk.durationMinutes} minutos` : null].filter(Boolean).join(' · ') || 'Horario a confirmar'}</Text></View>
    <View style={s.divider} />
    <View style={s.detailLine}><DashboardIcon name="paw" size={18} /><Text style={s.detailText}>{petNames(walk, pets)}</Text></View>
    <WalkTiming walk={walk} variant="owner" />
  </View>;
}
function HomeContent({ data, compact, navigate, onSearch }: { data: OwnerDashboard; compact: boolean; navigate: (tab: Tab) => void; onSearch: () => void }) {
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
      </> : <View><Text style={s.emptyTitleLeft}>Todavía no tenés paseos programados</Text>
        <Text style={s.subtitle}>Encontrá un paseador de confianza y organizá el próximo paseo de tu mascota.</Text></View>}
      <Pressable accessibilityRole="button" onPress={onSearch} style={[s.button, s.primary]} accessibilityLabel="Buscar paseador">
        <Text style={s.primaryText}>{next ? 'Buscar otro paseador' : 'Buscar paseador'}</Text>
      </Pressable>
    </View>
  </>;
}
function WalksContent({ walks: allWalks, pets }: { walks: readonly OwnerWalkSummary[]; pets: readonly OwnerPetSummary[] }) {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');
  const walks = allWalks.filter((walk) => filter === 'all' || (filter === 'scheduled' ? ['SCHEDULED', 'IN_PROGRESS'].includes(walk.status) : walk.status === 'COMPLETED'));
  return <>
    <View style={s.filters}>{([{ id: 'all', label: 'Todos' }, { id: 'scheduled', label: 'Programados y en curso' }, { id: 'completed', label: 'Completados' }] as const).map((item) =>
      <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: filter === item.id }} onPress={() => setFilter(item.id)} style={[s.filter, filter === item.id && s.filterActive]}>
        <Text style={[s.filterText, filter === item.id && s.filterTextActive]}>{item.label}</Text>
      </Pressable>)}</View>
    {walks.length ? walks.map((walk) => <WalkCard key={walk.id} walk={walk} pets={pets} />) : <View style={s.surface}>
      <EmptyState icon="calendar" title="Sin paseos para mostrar" description="Los paseos de esta categoría van a aparecer acá cuando estén disponibles." />
    </View>}
    <Text style={s.notice}>Los paseos aparecerán cuando una solicitud sea aceptada.</Text>
  </>;
}
function ProfileContent({ data }: { data: OwnerDashboard }) {
  return <View style={s.surface}>
    <View style={s.profileHeader}><DashboardAvatar variant="owner" name={data.name} uri={data.profileImage ?? null} />
      <View style={{ flex: 1 }}><Text style={s.sectionTitle}>{`${data.name} ${data.lastName}`.trim() || 'Mi cuenta'}</Text><Text style={s.petDetail}>Cuenta de dueño</Text></View>
    </View><View style={s.divider} />
    {[['Correo electrónico', data.email], ['Teléfono', data.phone]].map(([label, value]) => <View key={label}>
      <Text style={s.fieldLabel}>{label}</Text><Text selectable style={s.fieldValue}>{value || 'Sin informar'}</Text>
    </View>)}
    <Text style={s.notice}>La edición de los datos de tu perfil estará disponible próximamente.</Text>
  </View>;
}

export function OwnerHomeScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [tab, setTab] = useState<Tab>('home');
  const { state, reload } = useOwnerDashboard();
  const pets = usePets();
  const requests = useBookingRequests('owner');
  const walks = useWalks('owner');
  const [requestSent, setRequestSent] = useState(false);
  const data = state.status === 'ready' ? { ...state.data, pets: pets.state.status === 'ready' ? pets.state.data.items : state.data.pets,
    walks: walks.state.status === 'ready' ? walks.state.data.items : state.data.walks } : null;
  const name = data?.name || '';
  function navigate(next: Tab) { setTab(next); }
  function search() { setRequestSent(false); navigate('walkers'); }
  const independent = tab === 'pets' || tab === 'walkers' || tab === 'walks';
  const title = tab === 'home' ? name || 'Bienvenido' : tab === 'pets' ? 'Mis mascotas' : tab === 'walks' ? 'Mis paseos' : tab === 'walkers' ? 'Buscar paseador' : 'Mi perfil';
  const description = {
    home: '¿Listos para el próximo paseo?',
    pets: 'Tus compañeros de todos los días, en un solo lugar.',
    walks: 'Consultá lo que viene y recordá sus aventuras anteriores.',
    profile: 'Los datos de tu cuenta de Mascotas.',
    walkers: 'Encontrá un paseador disponible y organizá el próximo paseo.',
  }[tab];
  return <DashboardShell variant="owner" tabs={tabs} activeTab={tab} onTabChange={navigate}
    name={name} profileImage={data?.profileImage ?? null} title={title} subtitle={description}
    loading={tab === 'pets' ? pets.state.status === 'loading' : tab === 'walks' ? walks.state.status === 'loading' : !independent && state.status === 'loading'} refreshDisabled={tab === 'walkers'} onRefresh={() => { if (tab === 'pets') pets.retry(); else { pets.retry(); requests.retry(); walks.retry(); void reload(); } }}>
    {tab === 'pets' && <PetsScreen key={pets.uid} catalog={pets} />}
    {tab === 'walkers' && <WalkerSearchScreen key={pets.uid} pets={pets} onBack={() => navigate('home')} onPets={() => navigate('pets')} onSent={() => { setRequestSent(true); navigate('walks'); }} />}
    {tab === 'walks' && <>
      <Pressable accessibilityRole="button" onPress={search} style={[s.button, s.primary]}><Text style={s.primaryText}>Buscar paseador</Text></Pressable>
      {requestSent && <Text accessibilityLiveRegion="polite" style={[s.notice, { color: colors.primaryDark }]}>Tu solicitud se envió correctamente. Está pendiente de la respuesta del paseador.</Text>}
      <BookingRequestList requests={requests} />
      <Text accessibilityRole="header" style={s.sectionTitle}>Paseos confirmados</Text>
      {walks.state.status === 'loading' && <View style={s.surface}><ActivityIndicator color={colors.primary} /><Text style={s.notice}>Buscando tus paseos…</Text></View>}
      {walks.state.status === 'ready' && <WalksContent walks={walks.state.data.items} pets={pets.state.status === 'ready' ? pets.state.data.items : data?.pets ?? []} />}
    </>}
    {!independent && state.status === 'loading' && <View style={[s.surface, s.busySurface]}><ActivityIndicator color={colors.primary} /><Text accessibilityLiveRegion="polite" style={s.busyText}>Buscando tus mascotas y paseos…</Text></View>}
    {!independent && state.status === 'error' && <View style={s.surface}><EmptyState icon="refresh" title="No pudimos cargar tus datos" description={state.message} />
      <Pressable accessibilityRole="button" onPress={() => { void reload(); }} style={[s.button, s.primary]}><Text style={s.primaryText}>Volver a intentar</Text></Pressable>
    </View>}
    {tab === 'home' && pets.state.status === 'error' && <Text style={s.notice}>El resumen de mascotas puede estar desactualizado. Entrá a Mascotas para volver a conectarte.</Text>}
    {(tab === 'home' || tab === 'walks') && walks.state.status === 'error' && <View style={s.surface}><Text accessibilityRole="alert" style={s.notice}>No pudimos actualizar tus paseos: {walks.state.message}</Text><Pressable accessibilityRole="button" onPress={walks.retry} style={s.textLink}><Text style={s.textLinkLabel}>Volver a intentar</Text></Pressable></View>}
    {(tab === 'home' || tab === 'walks') && walks.state.status === 'ready' && (walks.state.data.fromCache || walks.state.data.pendingWrites) && <Text style={s.notice}>Los paseos muestran una copia guardada o cambios pendientes de confirmación.</Text>}
    {!independent && data && (tab === 'home' ? <HomeContent data={data} compact={compact} navigate={navigate} onSearch={search} /> : <ProfileContent data={data} />)}
  </DashboardShell>;
}

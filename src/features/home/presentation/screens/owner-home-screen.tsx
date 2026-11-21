import { DashboardShell } from '../components/dashboard-shell';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { type DashboardIconName } from '../../../../core/ui/dashboard-icon';
import { useOwnerHomeData } from '../hooks/use-owner-home-data';
import { colors, styles as s } from './owner-home.styles';
import { PetsScreen } from '../../../pets/presentation/screens/pets-screen';
import { WalkerSearchScreen } from '../../../walkers/presentation/screens/walker-search-screen';
import { type OwnerWalkFilter } from '../../../walks/presentation/state/owner-walks-state';
import { WalkTrackingScreen } from '../../../tracking/presentation/screens/walk-tracking-screen';

import { OwnerEmptyState, OwnerHomeContent, OwnerWalksContent, OwnerProfileContent, type Tab } from '../components/owner-dashboard-content';

const tabs: readonly { id: Tab; label: string; icon: DashboardIconName }[] = [
  { id: 'home', label: 'Inicio', icon: 'home' }, { id: 'pets', label: 'Mascotas', icon: 'paw' },
  { id: 'walks', label: 'Paseos', icon: 'calendar' }, { id: 'profile', label: 'Perfil', icon: 'user' },
];

export function OwnerHomeScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [tab, setTab] = useState<Tab>('home');
  const [walkFilter, setWalkFilter] = useState<OwnerWalkFilter>('ALL');
  const { state, reload, pets, requests, walks, data } = useOwnerHomeData();
  const [requestSent, setRequestSent] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null), [trackingAttempt, setTrackingAttempt] = useState(0);
  const name = data?.name || '';
  function navigate(next: Tab) { setTab(next); }
  function search() { setRequestSent(false); navigate('walkers'); }
  function track(id: string) { setTrackingId(id); navigate('tracking'); }
  const independent = tab === 'pets' || tab === 'walkers' || tab === 'walks' || tab === 'tracking';
  const title = tab === 'home' ? name || 'Bienvenido' : tab === 'pets' ? 'Mis mascotas' : tab === 'walks' ? 'Mis paseos' : tab === 'walkers' ? 'Buscar paseador' : tab === 'tracking' ? 'Seguimiento del paseo' : 'Mi perfil';
  const description = {
    home: '¿Listos para el próximo paseo?',
    pets: 'Tus compañeros de todos los días, en un solo lugar.',
    walks: 'Consultá tus solicitudes, próximos paseos e historial.',
    profile: 'Los datos de tu cuenta de Mascotas.',
    walkers: 'Encontrá un paseador disponible y organizá el próximo paseo.',
    tracking: 'La ubicación y el recorrido compartidos por el paseador.',
  }[tab];
  return <DashboardShell variant="owner" tabs={tabs} activeTab={tab} onTabChange={navigate}
    name={name} profileImage={data?.profileImage ?? null} title={title} subtitle={description}
    loading={tab === 'pets' ? pets.state.status === 'loading' : tab === 'walks' ? walks.state.status === 'loading' : !independent && state.status === 'loading'} refreshDisabled={tab === 'walkers'} onRefresh={() => { if (tab === 'tracking') setTrackingAttempt((value) => value + 1); else if (tab === 'pets') pets.retry(); else { pets.retry(); requests.retry(); walks.retry(); void reload(); } }}>
    {tab === 'pets' && <PetsScreen key={pets.uid} catalog={pets} />}
    {tab === 'walkers' && <WalkerSearchScreen key={pets.uid} pets={pets} onBack={() => navigate('home')} onPets={() => navigate('pets')} onSent={() => { setRequestSent(true); navigate('walks'); }} />}
    {tab === 'tracking' && trackingId && <WalkTrackingScreen key={`${pets.uid}:${trackingId}:${trackingAttempt}`} id={trackingId} onBack={() => navigate('walks')} />}
    {tab === 'walks' && <>
      <Pressable accessibilityRole="button" onPress={search} style={[s.button, s.primary]}><Text style={s.primaryText}>Buscar paseador</Text></Pressable>
      {requestSent && <Text accessibilityLiveRegion="polite" style={[s.notice, { color: colors.primaryDark }]}>Tu solicitud se envió correctamente.</Text>}
      {walks.state.status === 'loading' && <View style={s.surface}><ActivityIndicator color={colors.primary} /><Text style={s.notice}>Buscando tus paseos…</Text></View>}
      {walks.state.status === 'ready' && <OwnerWalksContent walks={walks.state.data.items} requests={requests} pets={pets.state.status === 'ready' ? pets.state.data.items : data?.pets ?? []} onTrack={track} filter={walkFilter} setFilter={setWalkFilter} />}
    </>}
    {!independent && state.status === 'loading' && <View style={[s.surface, s.busySurface]}><ActivityIndicator color={colors.primary} /><Text accessibilityLiveRegion="polite" style={s.busyText}>Buscando tus mascotas y paseos…</Text></View>}
    {!independent && state.status === 'error' && <View style={s.surface}><OwnerEmptyState icon="refresh" title="No pudimos cargar tus datos" description={state.message} />
      <Pressable accessibilityRole="button" onPress={() => { void reload(); }} style={[s.button, s.primary]}><Text style={s.primaryText}>Volver a intentar</Text></Pressable>
    </View>}
    {tab === 'home' && pets.state.status === 'error' && <Text style={s.notice}>El resumen de mascotas puede estar desactualizado. Entrá a Mascotas para volver a conectarte.</Text>}
    {(tab === 'home' || tab === 'walks') && walks.state.status === 'error' && <View style={s.surface}><Text accessibilityRole="alert" style={s.notice}>No pudimos actualizar tus paseos: {walks.state.message}</Text><Pressable accessibilityRole="button" onPress={walks.retry} style={s.textLink}><Text style={s.textLinkLabel}>Volver a intentar</Text></Pressable></View>}
    {(tab === 'home' || tab === 'walks') && walks.state.status === 'ready' && (walks.state.data.fromCache || walks.state.data.pendingWrites) && <Text style={s.notice}>Los paseos muestran una copia guardada o cambios pendientes de confirmación.</Text>}
    {!independent && data && (tab === 'home' ? <OwnerHomeContent data={data} compact={compact} navigate={navigate} onSearch={search} onTrack={track} /> : <OwnerProfileContent data={data} />)}
  </DashboardShell>;
}

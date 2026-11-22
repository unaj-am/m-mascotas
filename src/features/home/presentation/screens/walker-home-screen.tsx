import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { FormMessage } from '../../../../core/ui/auth-card';
import { DashboardShell, type DashboardTab } from '../components/dashboard-shell';
import { useWalkerHomeData } from '../hooks/use-walker-home-data';
import { colors, styles as s } from './walker-home.styles';
import { useWalkExecution } from '../../../walks/presentation/hooks/use-walk-execution';
import type { WalkAction } from '../../../../core/domain/use-cases/walk-execution-use-cases';

import { WalkerHomeContent, WalkerRequestsContent, WalkerAgendaContent, WalkerProfileContent, type Tab, type AgendaFilter } from '../components/walker-dashboard-content';

import type { WalkerCardActions } from '../components/walker-activity-cards';

const tabs: readonly DashboardTab<Tab>[] = [
  { id: 'home', label: 'Inicio', icon: 'home' }, { id: 'requests', label: 'Solicitudes', icon: 'inbox' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' }, { id: 'profile', label: 'Perfil', icon: 'user' },
];

export function WalkerHomeScreen() {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('home');
  const [agendaFilter, setAgendaFilter] = useState<AgendaFilter>('scheduled');
  function navigate(next: Tab, filter?: AgendaFilter) { setTab(next); if (filter) setAgendaFilter(filter); }
  const { state, reload, changeAvailability, availability, incoming, walks, liveWalks, data } = useWalkerHomeData();
  const execution = useWalkExecution();
  function perform(action: WalkAction, id: string) {
    void execution.act(action, id).then((walk) => { if (walk) navigate('agenda', walk.status === 'SCHEDULED' ? 'scheduled' : walk.status === 'IN_PROGRESS' ? 'active' : 'history'); });
  }
  const requestActions: WalkerCardActions = { execution, perform, disabled: incoming.state.status !== 'ready' || incoming.state.data.pendingWrites };
  const walkActions: WalkerCardActions = { execution, perform, disabled: walks.state.status !== 'ready' || walks.state.data.pendingWrites };
  const profileDependent = tab === 'home' || tab === 'profile';
  const title = tab === 'home' ? `Hola, ${data?.name || 'paseador'}` : tab === 'requests' ? 'Mis solicitudes' : tab === 'agenda' ? 'Mi agenda' : 'Mi perfil';
  const subtitle = { home: 'Este es el resumen de tu actividad.', requests: 'Revisá las solicitudes de paseo que recibiste.', agenda: 'Organizá tus paseos y consultá tu historial.', profile: 'Tus datos de contacto y tu perfil profesional.' }[tab];
  return <DashboardShell variant="walker" tabs={tabs} activeTab={tab} onTabChange={setTab} name={data?.name || ''}
    profileImage={data?.profileImage ?? null} title={title} subtitle={subtitle}>
    {profileDependent && state.status === 'loading' && <View style={[s.surface, s.busySurface]}><ActivityIndicator color={colors.primary} /><Text accessibilityLiveRegion="polite" style={s.busyText}>Cargando tu actividad…</Text></View>}
    {profileDependent && state.status === 'error' && <View style={s.surface}><Text style={s.emptyTitleLeft}>No pudimos cargar tu inicio</Text><Text style={s.subtitle}>{state.message}</Text>
      <Pressable accessibilityRole="button" onPress={() => { void reload(); }} style={[s.button, s.primary]}><Text style={s.primaryText}>Volver a intentar</Text></Pressable>
    </View>}
    {availability.message && <View style={availability.error ? s.error : s.feedback}><FormMessage message={availability.message} error={availability.error} /></View>}
    {(execution.operation.busy || execution.operation.message) && <View style={execution.operation.error ? s.error : s.feedback}><FormMessage message={execution.operation.busy ? 'Guardando los cambios del paseo…' : execution.operation.message} error={execution.operation.error} /></View>}
    {incoming.state.status === 'error' && <View style={s.surface}><Text accessibilityRole="alert" style={s.notice}>No pudimos actualizar las solicitudes: {incoming.state.message}</Text><Pressable accessibilityRole="button" onPress={incoming.retry} style={s.textLink}><Text style={s.textLinkLabel}>Volver a intentar</Text></Pressable></View>}
    {tab === 'requests' && incoming.state.status === 'loading' && <View style={s.surface}><ActivityIndicator color={colors.primary} /><Text style={s.notice}>Buscando tus solicitudes…</Text></View>}
    {incoming.state.status === 'ready' && (incoming.state.data.fromCache || incoming.state.data.pendingWrites) && <Text style={s.notice}>Las solicitudes muestran una copia guardada o cambios pendientes de confirmación.</Text>}
    {tab === 'requests' && incoming.state.status === 'ready' && <WalkerRequestsContent requests={incoming.state.data.items} {...requestActions} />}
    {walks.state.status === 'error' && <View style={s.surface}><Text accessibilityRole="alert" style={s.notice}>No pudimos actualizar tus paseos: {walks.state.message}</Text><Pressable accessibilityRole="button" onPress={walks.retry} style={s.textLink}><Text style={s.textLinkLabel}>Volver a intentar</Text></Pressable></View>}
    {tab === 'agenda' && walks.state.status === 'loading' && <View style={s.surface}><ActivityIndicator color={colors.primary} /><Text style={s.notice}>Buscando tus paseos…</Text></View>}
    {walks.state.status === 'ready' && (walks.state.data.fromCache || walks.state.data.pendingWrites) && <Text style={s.notice}>Los paseos muestran una copia guardada o cambios pendientes de confirmación.</Text>}
    {tab === 'agenda' && liveWalks && <WalkerAgendaContent walks={liveWalks} filter={agendaFilter} setFilter={setAgendaFilter} {...walkActions} />}
    {data && tab === 'home' && <WalkerHomeContent data={data} compact={width < 760} busy={availability.busy} onAvailabilityChange={(value) => { void changeAvailability(value); }} navigate={navigate} {...requestActions} />}
    {data && tab === 'profile' && <WalkerProfileContent data={data} />}
  </DashboardShell>;
}

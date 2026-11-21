import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { Walker } from '../../../../core/domain/entities/walker';
import type { PetCatalog } from '../../../pets/presentation/hooks/use-pets';
import { useWalkerSearch } from '../hooks/use-walker-search';
import { WalkerCard } from '../components/walker-card';
import { selectWalkers } from '../state/walker-search';
import { WalkRequestForm, formStyles } from '../components/walk-request-form';
import { createDashboardStyles, dashboardColors } from '../../../home/presentation/components/dashboard.styles';
import { DashboardIcon } from '../../../home/presentation/components/dashboard-icon';

const colors = dashboardColors.owner, s = createDashboardStyles(colors);

export function WalkerSearchScreen({ pets, onBack, onPets, onSent }: { pets: PetCatalog; onBack: () => void; onPets: () => void; onSent: () => void }) {
  const catalog = useWalkerSearch();
  const [selected, setSelected] = useState<Walker | null>(null), [search, setSearch] = useState('');
  const { state } = catalog;
  const { available, current, visible } = selectWalkers(state.status === 'ready' ? state.data.items : [], catalog.uid, selected, search);
  return <>
    <Pressable accessibilityRole="button" disabled={catalog.saving} onPress={onBack} style={s.textLink}><Text style={s.textLinkLabel}>Volver al inicio</Text></Pressable>
    {state.status === 'loading' && <View style={s.surface}><ActivityIndicator color={colors.primary} /><Text style={s.notice}>Buscando paseadores disponibles…</Text></View>}
    {state.status === 'error' && <View style={s.surface}><Text accessibilityRole="alert" style={formStyles.error}>{state.message}</Text><Pressable accessibilityRole="button" onPress={catalog.retry} style={s.textLink}><Text style={s.textLinkLabel}>Volver a intentar</Text></Pressable></View>}
    {state.status === 'ready' && (state.data.fromCache || state.data.pendingWrites) && <Text style={s.notice}>Mostrando una copia guardada. La disponibilidad se verificará al enviar la solicitud.</Text>}
    {selected ? <WalkRequestForm key={`${catalog.uid}:${selected.userId}`} walker={current ?? selected} available={!!current} catalog={catalog} pets={pets} onCancel={() => setSelected(null)} onSent={onSent} onPets={onPets} /> : <>
      <TextInput accessibilityLabel="Buscar paseadores por zona o descripción" placeholder="Buscar por zona o descripción" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={formStyles.input} />
      {state.status === 'ready' && <>
        <Text accessibilityRole="header" style={s.sectionTitle}>{visible.length} {visible.length === 1 ? 'paseador disponible' : 'paseadores disponibles'}</Text>
        {visible.map((walker) => <WalkerCard key={walker.userId} walker={walker} onSelect={() => setSelected(walker)} />)}
        {!visible.length && <View style={[s.surface, s.empty]}><DashboardIcon name="user" color={colors.primary} size={32} /><Text style={s.emptyTitle}>{available.length ? 'No encontramos coincidencias' : 'No hay paseadores disponibles'}</Text><Text style={s.emptyDescription}>{available.length ? 'Probá con otra zona o descripción.' : 'Los paseadores aparecerán cuando tengan un perfil profesional y activen su disponibilidad.'}</Text></View>}
      </>}
    </>}
  </>;
}

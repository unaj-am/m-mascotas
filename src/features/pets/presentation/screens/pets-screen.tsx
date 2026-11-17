import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import type { Pet, PetSize } from '../../../../core/domain/entities/pet';
import { DashboardIcon } from '../../../home/presentation/components/dashboard-icon';
import { createDashboardStyles, dashboardColors } from '../../../home/presentation/components/dashboard.styles';
import { PetForm } from '../components/pet-form';
import type { PetCatalog } from '../hooks/use-pets';

const colors = dashboardColors.owner;
const s = createDashboardStyles(colors);
const sizes: Record<PetSize, string> = { UNKNOWN: '', SMALL: 'Pequeño', MEDIUM: 'Mediano', LARGE: 'Grande', EXTRA_LARGE: 'Extra grande' };

function PetCard({ pet, onEdit, disabled }: { pet: Pet; onEdit: () => void; disabled: boolean }) {
  const [failed, setFailed] = useState(false);
  return <View style={s.surface}>
    <View style={s.profileHeader}><View style={s.petPhoto}>
      {pet.photoUri && !failed ? <Image source={{ uri: pet.photoUri }} style={s.image} accessibilityLabel={`Foto de ${pet.name}`} onError={() => setFailed(true)} /> : <DashboardIcon name="paw" size={28} color={colors.primary} />}
    </View><View style={{ flex: 1 }}><Text style={s.sectionTitle}>{pet.name}</Text><Text style={s.petDetail}>{pet.breed || 'Raza sin especificar'}</Text></View></View>
    <View style={[s.filters, { gap: 16 }]}>
      <Text style={s.detailText}>{pet.age} {pet.age === 1 ? 'año' : 'años'}</Text>
      <Text style={s.detailText}>{pet.weight.toLocaleString('es-AR')} kg</Text>
      {!!sizes[pet.size] && <Text style={s.detailText}>{sizes[pet.size]}</Text>}
    </View>
    {([['Comportamiento', pet.behavior], ['Necesidades especiales', pet.specialNeeds], ['Observaciones', pet.observations]] as const).filter(([, value]) => !!value).map(([label, value]) =>
      <View key={label}><Text style={s.fieldLabel}>{label}</Text><Text style={s.detailText}>{value}</Text></View>)}
    <Pressable accessibilityRole="button" accessibilityLabel={`Editar a ${pet.name}`} accessibilityState={{ disabled }} disabled={disabled} onPress={onEdit} style={[s.button, s.primary, disabled && s.muted]}>
      <Text style={s.primaryText}>Editar mascota</Text>
    </Pressable>
  </View>;
}

export function PetsScreen({ catalog }: { catalog: PetCatalog }) {
  const [form, setForm] = useState<{ kind: 'create' } | { kind: 'edit'; pet: Pet } | null>(null);
  const [saved, setSaved] = useState('');
  const { state } = catalog;
  if (form) return <PetForm key={`${catalog.uid}:${form.kind === 'edit' ? form.pet.id : 'new'}`} catalog={catalog}
    {...(form.kind === 'edit' ? { pet: form.pet } : {})}
    onSaved={() => { setForm(null); setSaved(form.kind === 'edit' ? 'Los datos de tu mascota se actualizaron correctamente.' : 'Tu mascota se registró correctamente.'); }}
    onCancel={() => setForm(null)} />;
  return <>
    <Pressable accessibilityRole="button" disabled={catalog.saving} onPress={() => { setSaved(''); setForm({ kind: 'create' }); }} style={[s.button, s.primary, catalog.saving && s.muted]}><DashboardIcon name="paw" color={colors.white} size={20} /><Text style={s.primaryText}>Registrar mascota</Text></Pressable>
    {!!saved && <Text accessibilityLiveRegion="polite" style={[s.notice, { color: colors.primaryDark }]}>{saved}</Text>}
    {state.status === 'loading' && <View style={[s.surface, s.busySurface]}><ActivityIndicator color={colors.primary} /><Text accessibilityLiveRegion="polite" style={s.busyText}>Buscando tus mascotas…</Text></View>}
    {state.status === 'error' && <View style={s.surface}><Text accessibilityRole="alert" style={s.emptyTitleLeft}>No pudimos cargar tus mascotas</Text><Text style={s.notice}>{state.message}</Text>
      <Pressable accessibilityRole="button" onPress={catalog.retry} style={[s.button, s.primary]}><Text style={s.primaryText}>Volver a intentar</Text></Pressable></View>}
    {state.status === 'ready' && <>
      {(state.data.fromCache || state.data.pendingWrites) && <Text accessibilityLiveRegion="polite" style={s.notice}>{state.data.pendingWrites ? 'Hay cambios pendientes de confirmación.' : 'Mostrando una copia guardada. Se actualizará al conectar con el servidor.'}</Text>}
      <Text accessibilityRole="header" style={s.sectionTitle}>{state.data.items.length} {state.data.items.length === 1 ? 'mascota registrada' : 'mascotas registradas'}</Text>
      {state.data.items.length ? state.data.items.map((pet) => <PetCard key={pet.id} pet={pet} disabled={catalog.saving} onEdit={() => { setSaved(''); setForm({ kind: 'edit', pet }); }} />) : <View style={s.surface}><View style={s.empty}>
        <View style={s.emptyIcon}><DashboardIcon name="paw" size={30} color={colors.primary} /></View>
        <Text style={s.emptyTitle}>Tu próxima aventura empieza acá</Text><Text style={s.emptyDescription}>Todavía no registraste mascotas. Agregá la primera para tener sus datos siempre a mano.</Text>
      </View></View>}
    </>}
  </>;
}

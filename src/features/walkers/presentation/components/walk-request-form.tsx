import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Walker } from '../../../../core/domain/entities/walker';
import type { PetCatalog } from '../../../pets/presentation/hooks/use-pets';
import type { WalkerSearch } from '../hooks/use-walker-search';
import { parseRequestSchedule } from '../../../walks/presentation/state/request-schedule';
import { createDashboardStyles, dashboardColors } from '../../../home/presentation/components/dashboard.styles';

const colors = dashboardColors.owner, s = createDashboardStyles(colors);
export const formStyles = StyleSheet.create({
  input: { minHeight: 48, borderWidth: 1, borderColor: '#d6cddd', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, color: colors.ink, backgroundColor: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  column: { flexGrow: 1, flexBasis: 180, gap: 6 },
  error: { color: '#a12d34', fontSize: 13, lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end' },
});

export function WalkRequestForm({ walker, available, catalog, pets, onCancel, onSent, onPets }: {
  walker: Walker; available: boolean; catalog: WalkerSearch; pets: PetCatalog; onCancel: () => void; onSent: () => void; onPets: () => void;
}) {
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [date, setDate] = useState(''), [time, setTime] = useState(''), [duration, setDuration] = useState('30'), [observations, setObservations] = useState('');
  const [message, setMessage] = useState('');
  const id = useRef<string | null>(null), busy = useRef(false), mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const f = formStyles;
  const ready = pets.state.status === 'ready';
  const items = pets.state.status === 'ready' ? pets.state.data.items : [];
  function toggle(value: string) { setSelected((current) => current.includes(value) ? current.filter((id) => id !== value) : [...current, value]); setMessage(''); }
  async function send() {
    if (busy.current || catalog.saving) return;
    setMessage('');
    if (!available) { setMessage('El paseador ya no está disponible. Volvé al listado para elegir otro.'); return; }
    if (!ready || selected.some((id) => !items.some((pet) => pet.id === id))) { setMessage('Actualizá las mascotas antes de enviar la solicitud.'); return; }
    if (selected.length > walker.maxPets) { setMessage(`Este paseador admite hasta ${walker.maxPets} mascotas por paseo.`); return; }
    const scheduledAt = parseRequestSchedule(date, time);
    if (!Number.isFinite(scheduledAt)) { setMessage('Ingresá una fecha válida (DD/MM/AAAA) y un horario válido (HH:MM).'); return; }
    if (!id.current) {
      const result = catalog.newId();
      if (!result.ok) { setMessage(result.error.message); return; }
      id.current = result.value;
    }
    busy.current = true;
    try {
      const result = await catalog.submit({ id: id.current, walkerId: walker.userId, petIds: selected, scheduledAt,
        durationMinutes: duration.trim() ? Number(duration.trim()) : NaN, observations });
      if (!mounted.current) return;
      if (result.ok) onSent(); else setMessage(result.error.message);
    } finally { busy.current = false; }
  }
  return <View style={s.surface}>
    <View><Text accessibilityRole="header" style={s.sectionTitle}>Solicitar un paseo</Text><Text style={s.subtitle}>{walker.serviceArea || 'Zona sin especificar'}</Text>
      <Text style={s.notice}>Capacidad: hasta {Math.min(walker.maxPets, 5)} mascotas · Tarifa por paseo: {walker.pricePerWalk.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</Text></View>
    {!available && <Text accessibilityRole="alert" style={f.error}>No pudimos confirmar la disponibilidad del paseador. Actualizá el listado o elegí otro.</Text>}
    <View><Text style={s.fieldValue}>¿Quiénes van a pasear?</Text><Text style={s.subtitle}>Seleccioná al menos una de tus mascotas.</Text></View>
    {pets.state.status === 'loading' && <ActivityIndicator color={colors.primary} />}
    {pets.state.status === 'error' && <View><Text accessibilityRole="alert" style={f.error}>{pets.state.message}</Text><Pressable accessibilityRole="button" onPress={pets.retry} style={s.textLink}><Text style={s.textLinkLabel}>Volver a cargar mascotas</Text></Pressable></View>}
    {ready && !items.length && <View><Text style={s.notice}>Primero necesitás registrar una mascota.</Text><Pressable accessibilityRole="button" onPress={onPets} style={s.textLink}><Text style={s.textLinkLabel}>Ir a mis mascotas</Text></Pressable></View>}
    {pets.state.status === 'ready' && pets.state.data.fromCache && <Text style={s.notice}>Mostrando las mascotas guardadas. Sus datos se verificarán al enviar.</Text>}
    {items.map((pet) => <Pressable key={pet.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(pet.id), disabled: catalog.saving }} disabled={catalog.saving}
      onPress={() => toggle(pet.id)} style={[s.petTile, selected.includes(pet.id) && { backgroundColor: colors.container, borderColor: colors.primary }]}>
      <Text style={[s.badgeText, { fontSize: 18 }]}>{selected.includes(pet.id) ? '✓' : '○'}</Text><View style={{ flex: 1 }}><Text style={s.petName}>{pet.name}</Text><Text style={s.petDetail}>{pet.breed || 'Raza sin especificar'}</Text></View>
    </Pressable>)}
    <View style={f.grid}>
      <View style={f.column}><Text style={s.fieldLabel}>Fecha *</Text><TextInput accessibilityLabel="Fecha del paseo, DD/MM/AAAA" placeholder="DD/MM/AAAA" placeholderTextColor={colors.muted} value={date} onChangeText={setDate} editable={!catalog.saving} maxLength={10} style={f.input} /></View>
      <View style={f.column}><Text style={s.fieldLabel}>Hora local *</Text><TextInput accessibilityLabel="Hora del paseo, HH:MM" placeholder="Ej.: 17:30" placeholderTextColor={colors.muted} value={time} onChangeText={setTime} editable={!catalog.saving} maxLength={5} style={f.input} /></View>
      <View style={f.column}><Text style={s.fieldLabel}>Duración en minutos *</Text><TextInput accessibilityLabel="Duración en minutos" value={duration} onChangeText={setDuration} editable={!catalog.saving} keyboardType="number-pad" inputMode="numeric" maxLength={4} style={f.input} /></View>
    </View>
    <View><Text style={s.fieldLabel}>Observaciones</Text><TextInput accessibilityLabel="Observaciones del paseo" placeholder="Indicaciones para el paseador" placeholderTextColor={colors.muted} value={observations} onChangeText={setObservations} editable={!catalog.saving} maxLength={1000} multiline style={[f.input, { minHeight: 90, textAlignVertical: 'top' }]} /></View>
    {!!message && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={f.error}>{message}</Text>}
    <Text accessibilityLiveRegion="polite" style={s.notice}>{catalog.saving ? 'Enviando la solicitud. Esperá la confirmación.' : 'La solicitud quedará pendiente hasta que el paseador la acepte.'}</Text>
    <View style={f.actions}>
      <Pressable accessibilityRole="button" disabled={catalog.saving} onPress={onCancel} style={[s.button, catalog.saving && s.muted]}><Text style={s.textLinkLabel}>Volver al listado</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: catalog.saving || !available || !ready || !items.length, busy: catalog.saving }} disabled={catalog.saving || !available || !ready || !items.length} onPress={() => { void send(); }} style={[s.button, s.primary, (catalog.saving || !available || !ready || !items.length) && s.muted]}>
        {catalog.saving && <ActivityIndicator color={colors.white} />}<Text style={s.primaryText}>{catalog.saving ? 'Enviando…' : 'Enviar solicitud'}</Text>
      </Pressable>
    </View>
  </View>;
}

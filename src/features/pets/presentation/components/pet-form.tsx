import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Pet, PetSize } from '../../../../core/domain/entities/pet';
import { createDashboardStyles, dashboardColors } from '../../../home/presentation/components/dashboard.styles';
import type { PetCatalog } from '../hooks/use-pets';

const colors = dashboardColors.owner;
const s = createDashboardStyles(colors);
const fields = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  field: { gap: 7 },
  gridField: { flexGrow: 1, flexBasis: 240, minWidth: 0, gap: 7 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#d6cddd', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, color: colors.ink, backgroundColor: colors.page },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 },
  secondary: { borderWidth: 1, borderColor: colors.border },
  error: { color: '#a12d34', fontSize: 13, lineHeight: 21 },
});

export function PetForm({ catalog, pet, onSaved, onCancel }: { catalog: PetCatalog; pet?: Pet; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(pet?.name ?? '');
  const [breed, setBreed] = useState(pet?.breed ?? '');
  const [age, setAge] = useState(pet ? String(pet.age) : '');
  const [weight, setWeight] = useState(pet ? String(pet.weight) : '');
  const [size, setSize] = useState<PetSize>(pet?.size ?? 'UNKNOWN');
  const [behavior, setBehavior] = useState(pet?.behavior ?? '');
  const [specialNeeds, setSpecialNeeds] = useState(pet?.specialNeeds ?? '');
  const [observations, setObservations] = useState(pet?.observations ?? '');
  const [message, setMessage] = useState('');
  const id = useRef<string | null>(pet?.id ?? null);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  // El formulario se desmonta al cambiar de cuenta o al salir de la pestaña.
  // El resultado de un envío anterior no debe modificar otro formulario.
  const latestCatalog = useRef(catalog);
  latestCatalog.current = catalog;

  async function submit() {
    if (submitting.current || catalog.saving) return;
    submitting.current = true;
    setMessage('');
    if (!id.current) {
      const prepared = catalog.newId();
      if (!prepared.ok) { setMessage(prepared.error.message); submitting.current = false; return; }
      id.current = prepared.value;
    }
    const uid = catalog.uid;
    const save = pet ? catalog.update : catalog.create;
    const result = await save({ id: id.current, name, breed, age: age.trim() ? Number(age.trim()) : NaN,
      weight: weight.trim() ? Number(weight.trim().replace(',', '.')) : NaN, size, behavior, specialNeeds, observations });
    submitting.current = false;
    if (!mounted.current || latestCatalog.current.uid !== uid) return;
    if (result.ok) onSaved();
    else setMessage(result.error.message);
  }
  return <View style={s.surface}>
    <View><Text accessibilityRole="header" style={s.sectionTitle}>{pet ? 'Editar mascota' : 'Nueva mascota'}</Text>
      <Text style={s.subtitle}>{pet ? `Actualizá la información de ${pet.name}.` : 'Completá sus datos.'} Los campos con * son obligatorios.</Text></View>
    <View style={fields.grid}>
      <View style={fields.gridField}><Text style={fields.label}>Nombre *</Text><TextInput accessibilityLabel="Nombre de la mascota, obligatorio" value={name} onChangeText={setName} editable={!catalog.saving} maxLength={80} autoCapitalize="words" style={fields.input} placeholder="Ej.: Luna" placeholderTextColor={colors.muted} /></View>
      <View style={fields.gridField}><Text style={fields.label}>Raza</Text><TextInput accessibilityLabel="Raza" value={breed} onChangeText={setBreed} editable={!catalog.saving} maxLength={80} autoCapitalize="words" style={fields.input} placeholder="Ej.: Mestiza" placeholderTextColor={colors.muted} /></View>
      <View style={fields.gridField}><Text style={fields.label}>Edad en años *</Text><TextInput accessibilityLabel="Edad en años, obligatoria" value={age} onChangeText={setAge} editable={!catalog.saving} keyboardType="number-pad" inputMode="numeric" maxLength={3} style={fields.input} placeholder="Ej.: 3 (0 si es menor de un año)" placeholderTextColor={colors.muted} /></View>
      <View style={fields.gridField}><Text style={fields.label}>Peso en kg *</Text><TextInput accessibilityLabel="Peso en kilogramos, obligatorio" value={weight} onChangeText={setWeight} editable={!catalog.saving} keyboardType="decimal-pad" inputMode="decimal" maxLength={8} style={fields.input} placeholder="Ej.: 12,5" placeholderTextColor={colors.muted} /></View>
    </View>
    <View><Text style={fields.label}>Tamaño</Text><View style={[s.filters, { marginTop: 10 }]}>
      {([{ value: 'UNKNOWN', label: 'Sin especificar' }, { value: 'SMALL', label: 'Pequeño' }, { value: 'MEDIUM', label: 'Mediano' }, { value: 'LARGE', label: 'Grande' }, { value: 'EXTRA_LARGE', label: 'Extra grande' }] as const).map((option) =>
        <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: size === option.value, disabled: catalog.saving }} disabled={catalog.saving} onPress={() => setSize(option.value)} style={[s.filter, size === option.value && s.filterActive]}>
          <Text style={[s.filterText, size === option.value && s.filterTextActive]}>{option.label}</Text>
        </Pressable>)}
    </View></View>
    <View style={fields.field}><Text style={fields.label}>Comportamiento</Text><TextInput accessibilityLabel="Comportamiento" value={behavior} onChangeText={setBehavior} editable={!catalog.saving} maxLength={200} style={fields.input} placeholder="Ej.: Sociable y tranquila" placeholderTextColor={colors.muted} /></View>
    <View style={fields.field}><Text style={fields.label}>Necesidades especiales</Text><TextInput accessibilityLabel="Necesidades especiales" value={specialNeeds} onChangeText={setSpecialNeeds} editable={!catalog.saving} maxLength={1000} multiline style={[fields.input, fields.multiline]} placeholder="Cuidados o indicaciones para tener en cuenta" placeholderTextColor={colors.muted} /></View>
    <View style={fields.field}><Text style={fields.label}>Observaciones</Text><TextInput accessibilityLabel="Observaciones" value={observations} onChangeText={setObservations} editable={!catalog.saving} maxLength={1000} multiline style={[fields.input, fields.multiline]} placeholder="Otros datos sobre tu mascota" placeholderTextColor={colors.muted} /></View>
    {!!message && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={fields.error}>{message}</Text>}
    {catalog.saving && <Text accessibilityLiveRegion="polite" style={s.notice}>Guardando tu mascota. Esperá la confirmación.</Text>}
    <View style={fields.actions}>
      <Pressable accessibilityRole="button" disabled={catalog.saving} onPress={onCancel} style={[s.button, fields.secondary, catalog.saving && s.muted]}><Text style={s.textLinkLabel}>Cancelar</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: catalog.saving, busy: catalog.saving }} disabled={catalog.saving} onPress={() => { void submit(); }} style={[s.button, s.primary, catalog.saving && s.muted]}>
        {catalog.saving && <ActivityIndicator color={colors.white} />}<Text style={s.primaryText}>{catalog.saving ? 'Guardando…' : pet ? 'Guardar cambios' : 'Guardar mascota'}</Text>
      </Pressable>
    </View>
  </View>;
}

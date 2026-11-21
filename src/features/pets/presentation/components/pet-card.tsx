import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { Pet, PetSize } from '../../../../core/domain/entities/pet';
import { DashboardIcon } from '../../../home/presentation/components/dashboard-icon';
import { createDashboardStyles, dashboardColors } from '../../../home/presentation/components/dashboard.styles';

const colors = dashboardColors.owner;
const s = createDashboardStyles(colors);
const sizes: Record<PetSize, string> = { UNKNOWN: '', SMALL: 'Pequeño', MEDIUM: 'Mediano', LARGE: 'Grande', EXTRA_LARGE: 'Extra grande' };

export function PetCard({ pet, onEdit, disabled }: { pet: Pet; onEdit: () => void; disabled: boolean }) {
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

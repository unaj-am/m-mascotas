import { Pressable, Text, View } from 'react-native';
import type { Walker } from '../../../../core/domain/entities/walker';
import { createDashboardStyles, dashboardColors } from '../../../home/presentation/components/dashboard.styles';

const s = createDashboardStyles(dashboardColors.owner);

export function WalkerCard({ walker, onSelect }: { walker: Walker; onSelect: () => void }) {
  return <View style={s.surface}>
    <View style={s.walkHeader}><Text style={[s.sectionTitle, { flex: 1 }]}>{walker.serviceArea || 'Zona sin especificar'}</Text><View style={s.badge}><Text style={s.badgeText}>Disponible</Text></View></View>
    <Text style={s.detailText}>{walker.description || 'Paseos y cuidado de mascotas.'}</Text>
    <View style={s.filters}><Text style={s.petDetail}>{walker.experienceYears} {walker.experienceYears === 1 ? 'año' : 'años'} de experiencia</Text><Text style={s.petDetail}>Hasta {walker.maxPets} {walker.maxPets === 1 ? 'mascota' : 'mascotas'}</Text></View>
    <View style={s.walkHeader}><View><Text style={s.fieldLabel}>Precio por paseo</Text><Text style={s.sectionTitle}>{walker.pricePerWalk.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</Text></View>
      <Text style={s.petDetail}>{walker.rating === null ? 'Sin calificar' : `★ ${walker.rating.toLocaleString('es-AR', { maximumFractionDigits: 1 })} / 5`}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Solicitar paseo en ${walker.serviceArea || 'esta zona'}`} onPress={onSelect} style={[s.button, s.primary]}><Text style={s.primaryText}>Solicitar paseo</Text></Pressable>
  </View>;
}

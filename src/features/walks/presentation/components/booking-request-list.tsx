import { Text, View } from 'react-native';
import type { WalkRequest } from '../../../../core/domain/entities/walk-request';
import { createDashboardStyles, dashboardColors } from '../../../../core/ui/dashboard.styles';

const s = createDashboardStyles(dashboardColors.owner);
const labels = { PENDING: 'Pendiente', ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada' };
export function BookingRequestList({ items }: { items: readonly WalkRequest[] }) {
  if (!items.length) return null;
  return <>
    <View><Text accessibilityRole="header" style={s.sectionTitle}>Solicitudes</Text><Text style={s.subtitle}>Estado de las solicitudes que enviaste.</Text></View>
      {items.map((request) => <View key={request.id} style={s.surface}>
        <View style={s.walkHeader}><Text style={[s.petName, { flex: 1 }]}>{request.petNames.join(', ') || 'Solicitud de paseo'}</Text><View style={s.badge}><Text style={s.badgeText}>{labels[request.status]}</Text></View></View>
        <Text style={s.detailText}>{request.scheduledAt > 0 ? new Date(request.scheduledAt).toLocaleString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha sin definir'}</Text>
        <Text style={s.petDetail}>{request.durationMinutes} minutos</Text>
        {!!request.observations && <Text style={s.detailText}>{request.observations}</Text>}
        {request.status === 'PENDING' && <Text style={s.notice}>Esperando la respuesta del paseador.</Text>}
      </View>)}
  </>;
}

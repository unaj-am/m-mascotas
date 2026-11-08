import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { BookingRequests } from '../hooks/use-booking-requests';
import { createDashboardStyles, dashboardColors } from '../../../home/presentation/components/dashboard.styles';

const s = createDashboardStyles(dashboardColors.owner);
const labels = { PENDING: 'Pendiente', ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada' };
export function BookingRequestList({ requests }: { requests: BookingRequests }) {
  const { state } = requests;
  return <>
    <Text accessibilityRole="header" style={s.sectionTitle}>Mis solicitudes</Text>
    {state.status === 'loading' && <View style={s.surface}><ActivityIndicator color={dashboardColors.owner.primary} /><Text style={s.notice}>Buscando tus solicitudes…</Text></View>}
    {state.status === 'error' && <View style={s.surface}><Text accessibilityRole="alert" style={s.notice}>{state.message}</Text><Pressable accessibilityRole="button" onPress={requests.retry} style={s.textLink}><Text style={s.textLinkLabel}>Volver a intentar</Text></Pressable></View>}
    {state.status === 'ready' && <>
      {(state.data.fromCache || state.data.pendingWrites) && <Text style={s.notice}>{state.data.pendingWrites ? 'Hay cambios pendientes de confirmación.' : 'Mostrando una copia guardada. Se actualizará al conectar con el servidor.'}</Text>}
      {state.data.items.length ? state.data.items.map((request) => <View key={request.id} style={s.surface}>
        <View style={s.walkHeader}><Text style={[s.petName, { flex: 1 }]}>{request.petNames.join(', ') || 'Solicitud de paseo'}</Text><View style={s.badge}><Text style={s.badgeText}>{labels[request.status]}</Text></View></View>
        <Text style={s.detailText}>{request.scheduledAt > 0 ? new Date(request.scheduledAt).toLocaleString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha sin definir'}</Text>
        <Text style={s.petDetail}>{request.durationMinutes} minutos</Text>
        {!!request.observations && <Text style={s.detailText}>{request.observations}</Text>}
        {request.status === 'PENDING' && <Text style={s.notice}>Esperando la respuesta del paseador.</Text>}
      </View>) : <View style={s.surface}><Text style={s.emptyTitleLeft}>Todavía no enviaste solicitudes</Text><Text style={s.notice}>Buscá un paseador disponible y elegí el próximo paseo de tus mascotas.</Text></View>}
    </>}
  </>;
}

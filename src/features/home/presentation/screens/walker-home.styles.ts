import { StyleSheet } from 'react-native';
import { createDashboardStyles, dashboardColors } from '../../../../core/ui/dashboard.styles';

export const colors = dashboardColors.walker;
export const styles = {
  ...createDashboardStyles(colors),
  ...StyleSheet.create({
    availabilityHeading: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', alignItems: 'center' },
    availabilityRow: { flexDirection: 'row', gap: 16, justifyContent: 'space-between', alignItems: 'center' },
    availabilityTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
    availabilityDetail: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
    statRows: { gap: 14 },
    sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    requestTitle: { color: colors.ink, fontSize: 16, fontWeight: '600', flex: 1 },
    feedback: { borderWidth: 1, borderColor: '#c7dfcd', borderRadius: 14, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#eef7ef' },
  }),
};

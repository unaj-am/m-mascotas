import { useWalkerDashboard } from './use-walker-dashboard';
import { useBookingRequests } from '../../../walks/presentation/hooks/use-booking-requests';
import { useWalks } from '../../../walks/presentation/hooks/use-walks';

export function useWalkerHomeData() {
  const { state, reload, changeAvailability, availability } = useWalkerDashboard();
  const incoming = useBookingRequests('walker');
  const walks = useWalks('walker');

  const liveWalks = walks.state.status === 'ready' ? walks.state.data.items.map((walk) => ({ ...walk,
    petNames: incoming.state.status === 'ready' ? incoming.state.data.items.find((request) => request.id === walk.id)?.petNames ?? []
      : state.status === 'ready' ? state.data.walks.find((item) => item.id === walk.id)?.petNames ?? [] : [] })) : null;
  const data = state.status === 'ready' ? { ...state.data, requests: incoming.state.status === 'ready' ? incoming.state.data.items : state.data.requests, walks: liveWalks ?? state.data.walks } : null;

  return { state, reload, changeAvailability, availability, incoming, walks, liveWalks, data };
}

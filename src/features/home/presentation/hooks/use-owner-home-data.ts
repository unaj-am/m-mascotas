import { useOwnerDashboard } from './use-owner-dashboard';
import { usePets } from '../../../pets/presentation/hooks/use-pets';
import { useBookingRequests } from '../../../walks/presentation/hooks/use-booking-requests';
import { useWalks } from '../../../walks/presentation/hooks/use-walks';

export function useOwnerHomeData() {
  const { state, reload } = useOwnerDashboard();
  const pets = usePets();
  const requests = useBookingRequests('owner');
  const walks = useWalks('owner');

  const data = state.status === 'ready' ? { ...state.data, pets: pets.state.status === 'ready' ? pets.state.data.items : state.data.pets,
    walks: walks.state.status === 'ready' ? walks.state.data.items : state.data.walks } : null;

  return { state, reload, pets, requests, walks, data };
}

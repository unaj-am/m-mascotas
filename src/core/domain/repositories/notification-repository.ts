import type { Result } from '../../../shared/types/result';
import type { Observer, Unsubscribe } from '../../../shared/types/subscription';
import type { AppNotification } from '../entities/notification';

export interface NotificationRepository {
  observeCurrentUserNotifications(observer: Observer<readonly AppNotification[]>): Unsubscribe;
  markAsRead(notificationId: string): Promise<Result<void>>;
}

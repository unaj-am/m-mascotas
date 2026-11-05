export type AppNotification = Readonly<{
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  referenceId: string;
  isRead: boolean;
  createdAt: number;
}>;

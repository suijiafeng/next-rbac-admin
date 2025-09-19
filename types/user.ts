export interface UserItem {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  status: number;
  createdAt: string;
  updatedAt: string;
}
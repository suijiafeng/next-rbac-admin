export interface UserItem {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  avatar: string | null;
  role: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

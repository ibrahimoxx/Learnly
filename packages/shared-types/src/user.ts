import { UserRole } from "./enums";

export interface UserDTO {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
  role: UserRole;
  bio: string | null;
  website: string | null;
  createdAt: string;
}

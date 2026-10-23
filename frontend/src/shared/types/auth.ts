export type Role =
  | "SUPER_ADMIN"
  | "REGIONAL_ADMIN"
  | "SCIENCE_COMMUNICATOR";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  regionId?: string | null;
  role: Role;
  permissions: string[];
}

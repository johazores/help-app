export type SafetyNetStatus = "ACTIVE" | "OPENED" | "RECEIVED" | "CLOSED";
export type ActivityType = "CREATED" | "CHECKED_IN" | "OPENED_TO_FAMILY" | "RECEIVED" | "CLOSED";

export type Role = "USER" | "ROOT";

export interface Profile {
  id: string;
  name: string;
  phone: string;
  balance: string;
  role: Role;
}

export interface AppConfig {
  network: string;
  explorerTxUrl: string;
  explorerAccountUrl: string;
}

export interface AdminStats {
  users: number;
  safetyNets: number;
  active: number;
  received: number;
  totalSetAside: string;
}

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
  publicKey: string | null;
  safetyNets: number;
  recipients: number;
  createdAt: string;
}

export interface AdminSafetyNet {
  id: string;
  label: string;
  amount: string;
  status: SafetyNetStatus;
  ownerName: string;
  recipientName: string;
  unlockAt: string;
  createdAt: string;
}

export interface AdminTransaction {
  id: string;
  type: ActivityType;
  description: string;
  txHash: string | null;
  netLabel: string;
  ownerName: string;
  createdAt: string;
}

export interface AdminOverview {
  explorer: AppConfig;
  stats: AdminStats;
  users: AdminUser[];
  safetyNets: AdminSafetyNet[];
  transactions: AdminTransaction[];
}

export interface Recipient {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
}

export interface SafetyNet {
  id: string;
  label: string;
  amount: string;
  forName: string;
  forRelationship: string;
  checkInIntervalMinutes: number;
  unlockAt: string;
  lastCheckInAt: string;
  claimCode: string;
  status: SafetyNetStatus;
  isOpen: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  txHash: string | null;
  createdAt: string;
}

export interface SafetyNetDetail extends SafetyNet {
  activity: Activity[];
}

export interface ClaimInfo {
  label: string;
  amount: string;
  fromName: string;
  forName: string;
  status: SafetyNetStatus;
  isOpen: boolean;
  unlockAt: string;
}

export interface Rates {
  base: "XLM";
  rates: Record<string, number>;
  fetchedAt: string;
  stale: boolean;
}

export interface DepositInfo {
  address: string;
  balance: string;
}

export type SafetyNetStatus = "ACTIVE" | "OPENED" | "RECEIVED" | "GUARDED" | "BACKUP_RECEIVED" | "CLOSED";
export type ActivityType = "CREATED" | "CHECKED_IN" | "OPENED_TO_FAMILY" | "RECEIVED" | "RECEIVER_CHECKED_IN" | "BACKUP_RECEIVED" | "CLOSED";

export type Role = "USER" | "ROOT"; // retained for AdminUser display only

export interface Profile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  emailVerified: boolean;
  avatar: string | null;
  balance: string;
  hasWallet: boolean;
  activeWalletName: string | null;
}

export interface WalletInfo {
  id: string;
  name: string;
  imported: boolean;
  address: string;
  active: boolean;
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  device: string;
  lastSeenAt: string;
  createdAt: string;
  current: boolean;
}

export interface AppConfig {
  network: string;
  explorerTxUrl: string;
  explorerAccountUrl: string;
  heldAsset: "XLM" | "USDC";
}

export interface AdminStats {
  users: number;
  safetyNets: number;
  active: number;
  received: number;
  opened: number;
  checkIns: number;
  delivered: number;
  totalSetAside: string;
}

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
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
  kind: string;
  requestState: string;
  label: string;
  amount: string;
  forName: string;
  forRelationship: string;
  backupName: string | null;
  backupRelationship: string | null;
  postReceiptCheckInIntervalMinutes: number | null;
  postReceiptUnlockAt: string | null;
  postReceiptLastCheckInAt: string | null;
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

export interface SafetyNetCardSummary {
  forName: string;
  amount: string;
  claimCode: string;
}

export interface ClaimInfo {
  kind: string;
  requestState: string;
  label: string;
  amount: string;
  fromName: string;
  forName: string;
  backupName: string | null;
  status: SafetyNetStatus;
  isOpen: boolean;
  unlockAt: string;
  receivedTxHash: string | null;
  hasBackup: boolean;
  guardUnlockAt: string | null;
  guardIsOpen: boolean;
  postReceiptLastCheckInAt: string | null;
}

export interface Rates {
  base: "XLM" | "USDC";
  rates: Record<string, number>;
  fetchedAt: string;
  stale: boolean;
}

export interface DepositInfo {
  address: string;
  balance: string;
  walletName: string;
}

export interface Pot {
  id: string;
  name: string;
  target: string;
  saved: string;
}

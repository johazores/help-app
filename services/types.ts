export type SafetyNetStatus = "ACTIVE" | "OPENED" | "RECEIVED" | "CLOSED";
export type ActivityType = "CREATED" | "CHECKED_IN" | "OPENED_TO_FAMILY" | "RECEIVED" | "CLOSED";

export interface Profile {
  id: string;
  name: string;
  phone: string;
  balance: string;
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

import { apiClient } from "@/services/api-client";

export interface PaluwaganSummary {
  id: string;
  name: string;
  status: string;
  amount: string;
  frequencyMinutes: number;
  currentCycle: number;
  memberCount: number;
  inviteCode: string;
  myRole: string;
}

export interface PaluwaganInvite {
  name: string;
  ownerName: string;
  amount: string;
  frequencyMinutes: number;
  memberCount: number;
  maxMembers: number;
  status: string;
  yourPositionIfJoined: number;
}

export interface PaluwaganDetail {
  id: string;
  name: string;
  status: string;
  amount: string;
  frequencyMinutes: number;
  currentCycle: number;
  inviteCode: string;
  iAmOwner: boolean;
  memberCount: number;
  members: { name: string; position: number; isMe: boolean; isOwner: boolean }[];
  cycles: {
    id: string;
    cycleNumber: number;
    dueAt: string;
    status: string;
    recipientName: string;
    recipientIsMe: boolean;
    paid: { memberName: string; isMe: boolean; status: string }[];
  }[];
}

class PaluwaganClient {
  async list(): Promise<PaluwaganSummary[]> {
    return apiClient.request("/paluwagan");
  }
  async create(input: { name: string; amount: string; frequencyMinutes: number; pin: string }): Promise<{ id: string; inviteCode: string }> {
    return apiClient.request("/paluwagan", { method: "POST", body: input });
  }
  async detail(id: string): Promise<PaluwaganDetail> {
    return apiClient.request(`/paluwagan/${id}`);
  }
  async start(id: string, pin: string): Promise<void> {
    await apiClient.request(`/paluwagan/${id}/start`, { method: "POST", body: { pin } });
  }
  async contribute(id: string, pin: string): Promise<{ txHash: string }> {
    return apiClient.request(`/paluwagan/${id}/contribute`, { method: "POST", body: { pin } });
  }
  async invite(code: string): Promise<PaluwaganInvite> {
    return apiClient.request(`/paluwagan/invite/${code}`, { auth: false });
  }
  async join(code: string, pin: string): Promise<{ id: string }> {
    return apiClient.request(`/paluwagan/invite/${code}/join`, { method: "POST", body: { pin } });
  }
}

export const paluwaganClient = new PaluwaganClient();

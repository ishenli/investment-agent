export interface AgentType {
  id: number;
  slug: string;
  name: string;
  type: 'LOCAL' | 'LINGXI';
  description: string | null;
  systemRole: string | null;
  logo: string | null;
  apiKey: string;
  apiUrl: string;
  openingQuestions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentTypeResponse {
  id: number;
  slug: string;
  name: string;
  type: 'LOCAL' | 'LINGXI';
  description: string | null;
  systemRole: string | null;
  logo: string | null;
  apiKey: string;
  apiUrl: string;
  openingQuestions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentRequestType {
  name: string;
  slug: string;
  type: 'LOCAL' | 'LINGXI';
  description?: string | null;
  systemRole?: string | null;
  logo?: string | null;
  apiKey: string;
  apiUrl: string;
  openingQuestions?: string[];
}

export interface UpdateAgentRequestType {
  name?: string;
  slug?: string;
  type?: 'LOCAL' | 'LINGXI';
  description?: string | null;
  systemRole?: string | null;
  logo?: string | null;
  apiKey?: string;
  apiUrl?: string;
  openingQuestions?: string[];
}

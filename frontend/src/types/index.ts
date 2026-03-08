export interface Staff {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface Client {
  id: number;
  name: string;
  name_kana: string;
  birth_date: string;
  gender: string;
  disability_type: string;
  disability_certificate_level: string;
  address: string;
  phone: string;
  emergency_contact: string;
  emergency_phone: string;
  staff_id: number;
  status: string;
  intake_date: string;
  notes: string;
}

export interface SupportPlan {
  id: number;
  client_id: number;
  plan_date: string;
  long_term_goal: string;
  short_term_goal: string;
  service_contents: string[];
  monitoring_interval: number;
  next_monitoring_date: string;
  status: string;
}

export interface CaseRecord {
  id: number;
  client_id: number;
  staff_id: number;
  record_date: string;
  record_type: string;
  content: string;
  summary: string;
  next_action: string;
}

export interface Schedule {
  id: number;
  client_id: number | null;
  staff_id: number;
  title: string;
  schedule_type: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  notes: string;
  status: string;
  client?: Client;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
}

export interface StreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  name?: string;
  input?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

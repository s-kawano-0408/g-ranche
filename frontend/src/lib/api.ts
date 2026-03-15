import {
  Client,
  SupportPlan,
  CaseRecord,
  Schedule,
  MonthlyTask,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `API error: ${res.status}`);
  }

  return res.json();
}

// Clients
export async function getClients(): Promise<Client[]> {
  return fetchAPI<Client[]>("/api/clients");
}

export async function getClient(id: number): Promise<Client> {
  return fetchAPI<Client>(`/api/clients/${id}`);
}

export async function createClient(data: Record<string, unknown>): Promise<Client> {
  return fetchAPI<Client>("/api/clients", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateClient(
  id: number,
  data: Partial<Client>,
): Promise<Client> {
  return fetchAPI<Client>(`/api/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteClient(id: number): Promise<void> {
  await fetch(`${BASE_URL}/api/clients/${id}`, { method: "DELETE" });
}

// Support Plans
export async function getSupportPlans(
  clientId?: number,
): Promise<SupportPlan[]> {
  const query = clientId ? `?client_id=${clientId}` : "";
  return fetchAPI<SupportPlan[]>(`/api/support-plans${query}`);
}

export async function createSupportPlan(
  data: Omit<SupportPlan, "id">,
): Promise<SupportPlan> {
  return fetchAPI<SupportPlan>("/api/support-plans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Case Records
export async function getCaseRecords(clientId?: number): Promise<CaseRecord[]> {
  const query = clientId ? `?client_id=${clientId}` : "";
  return fetchAPI<CaseRecord[]>(`/api/records${query}`);
}

export async function createCaseRecord(
  data: Omit<CaseRecord, "id">,
): Promise<CaseRecord> {
  return fetchAPI<CaseRecord>("/api/records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCaseRecord(
  id: number,
  data: Partial<CaseRecord>,
): Promise<CaseRecord> {
  return fetchAPI<CaseRecord>(`/api/records/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Schedules
export async function getSchedules(params?: {
  client_id?: number;
  start_date?: string;
  end_date?: string;
}): Promise<Schedule[]> {
  const query = params
    ? "?" +
      new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, String(v)]),
        ),
      ).toString()
    : "";
  return fetchAPI<Schedule[]>(`/api/schedules${query}`);
}

export async function getTodaySchedules(): Promise<Schedule[]> {
  return fetchAPI<Schedule[]>("/api/schedules/today");
}

export async function createSchedule(
  data: Omit<Schedule, "id">,
): Promise<Schedule> {
  return fetchAPI<Schedule>("/api/schedules", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSchedule(
  id: number,
  data: Partial<Schedule>,
): Promise<Schedule> {
  return fetchAPI<Schedule>(`/api/schedules/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSchedule(id: number): Promise<void> {
  const token = localStorage.getItem("token");
  await fetch(`${BASE_URL}/api/schedules/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// Monthly Tasks
export async function getMonthlyTasks(year?: number): Promise<MonthlyTask[]> {
  const query = year ? `?year=${year}` : "";
  return fetchAPI<MonthlyTask[]>(`/api/monthly-tasks${query}`);
}

export async function upsertMonthlyTask(data: {
  client_id: number;
  year: number;
  month: number;
  task_type: string;
}): Promise<MonthlyTask> {
  return fetchAPI<MonthlyTask>("/api/monthly-tasks", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMonthlyTask(
  clientId: number,
  year: number,
  month: number,
): Promise<void> {
  await fetch(
    `${BASE_URL}/api/monthly-tasks?client_id=${clientId}&year=${year}&month=${month}`,
    { method: "DELETE" },
  );
}

// AI
export async function streamAIChat(
  message: string,
  sessionId: string,
  conversationHistory: { role: string; content: string }[],
): Promise<Response> {
  return fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      conversation_history: conversationHistory,
    }),
  });
}

export async function generateSupportPlan(
  clientId: number,
): Promise<{ plan: string }> {
  return fetchAPI<{ plan: string }>("/api/ai/generate-plan", {
    method: "POST",
    body: JSON.stringify({ client_id: clientId }),
  });
}

export async function summarizeRecord(
  recordId: number,
): Promise<{ summary: string }> {
  return fetchAPI<{ summary: string }>("/api/ai/summarize-record", {
    method: "POST",
    body: JSON.stringify({ record_id: recordId }),
  });
}

export async function generateReport(
  clientId: number,
): Promise<{ report: string }> {
  return fetchAPI<{ report: string }>("/api/ai/generate-report", {
    method: "POST",
    body: JSON.stringify({ client_id: clientId }),
  });
}

// Users (admin)
export async function getUsers(): Promise<{ id: number; email: string; name: string; role: string }[]> {
  return fetchAPI("/api/auth/users");
}

export async function changePassword(userId: number, newPassword: string): Promise<{ message: string }> {
  return fetchAPI(`/api/auth/users/${userId}/password`, {
    method: "PUT",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

export async function login(
  email: string,
  password: string,
): Promise<{ access_token: string; token_type: string }> {
  return fetchAPI<{ access_token: string; token_type: string }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
}

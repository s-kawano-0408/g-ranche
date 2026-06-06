"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface FeatureFlags {
  enable_ai: boolean;
  enable_transcription: boolean;
}

export function useFeatureFlags() {
  const { data } = useSWR<FeatureFlags>("/api/config", fetcher);
  return {
    enableAI: data?.enable_ai ?? false,
    enableTranscription: data?.enable_transcription ?? false,
    loaded: data !== undefined,
  };
}

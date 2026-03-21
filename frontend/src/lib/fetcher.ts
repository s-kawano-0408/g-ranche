/**
 * SWR用のfetcher関数
 * api.tsのfetchAPIと同じ認証・エラーハンドリングをSWR向けに提供
 */
export async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('セッションが切れました。再ログインしてください。');
  }

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `API error: ${res.status}`);
  }

  return res.json();
}

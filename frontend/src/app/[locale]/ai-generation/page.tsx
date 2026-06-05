'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AiGenerationPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ai-generation/requirement-analysis');
  }, [router]);

  return null;
}

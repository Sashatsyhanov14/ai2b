import { Suspense } from 'react';
import LeadsPageClient from './LeadsPageClient';

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading leads...</div>}>
      <LeadsPageClient />
    </Suspense>
  );
}


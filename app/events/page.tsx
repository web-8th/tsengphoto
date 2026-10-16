import { CollectionsPageContent } from '@/components/collections/CollectionsPageContent';
import type { Metadata } from 'next';

// Static metadata (no searchParams) so this page is served from the CDN, not rendered per request
export const metadata: Metadata = {
  title: 'Events | Tseng Photography',
  description:
    "Capturing life's special moments. From weddings to corporate gatherings, explore our event photography portfolio that preserves memories.",
};

export default function EventsPage() {
  return (
    <CollectionsPageContent
      title='Events'
      description="Capturing life's special moments. From weddings to corporate gatherings, explore our event photography portfolio that preserves memories."
      filterType='event'
      addButtonText='Add New Event'
      countLabel='events'
      itemTypeName='event'
      showGroupsAndUnique={false}
    />
  );
}

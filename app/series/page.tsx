import { CollectionsPageContent } from '@/components/collections/CollectionsPageContent';
import type { Metadata } from 'next';

// Static metadata (no searchParams) so this page is served from the CDN, not rendered per request
export const metadata: Metadata = {
  title: 'Series | Tseng Photography',
  description:
    'Ongoing photography projects and thematic collections. From mountain adventures to urban landscapes, each series tells a unique visual story.',
};

export default function SeriesPage() {
  return (
    <CollectionsPageContent
      title='Series'
      description='Ongoing photography projects and thematic collections. From mountain adventures to urban landscapes, each series tells a unique visual story.'
      filterType='series'
      addButtonText='Add New Series'
      countLabel='series'
      itemTypeName='series'
      showGroupsAndUnique={false}
    />
  );
}

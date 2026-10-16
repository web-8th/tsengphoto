'use client';

import CollectionsLoading from '@/app/collections/loading';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/animate-ui/components/alert-dialog';
import { Button } from '@/components/animate-ui/components/button';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { CollectionForm } from '@/components/collections/CollectionForm';
import { CollectionGrid } from '@/components/collections/CollectionGrid';
import { CollectionGroupCard } from '@/components/collections/CollectionGroupCard';
import { SearchAndFilterBar } from '@/components/SearchAndFilterBar';
import { Text } from '@/components/Text';
import { Separator } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { collectionGroupsQueryKeys } from '@/lib/queries/collection-groups';
import { collectionsQueryKeys } from '@/lib/queries/collections';
import type { CollectionGroup, CollectionWithImages } from '@/lib/types';
import { getDelayClass } from '@/utils/animations';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface CollectionsPageContentProps {
  title: string;
  description: string;
  filterType?: 'series' | 'event' | null;
  addButtonText: string;
  countLabel: string;
  itemTypeName: string;
  showGroupsAndUnique?: boolean;
}

export function CollectionsPageContent({
  title,
  description,
  filterType = null,
  addButtonText,
  countLabel,
  itemTypeName,
  showGroupsAndUnique = false,
}: CollectionsPageContentProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionWithImages | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [filteredCollections, setFilteredCollections] = useState<CollectionWithImages[]>(
    []
  );
  const [isFiltered, setIsFiltered] = useState(false);

  // Get all filter params from URL
  const searchQuery = searchParams.get('q') || '';
  const typeFilter = searchParams.get('type');
  const groupFilter = searchParams.get('group');

  // Helper to update URL params
  const updateURLParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== '') {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      const newSearch = params.toString();
      router.push(newSearch ? `${pathname}?${newSearch}` : pathname);
    },
    [router, pathname, searchParams]
  );

  const handleFilteredResults = useCallback(
    (results: CollectionWithImages[], filtered: boolean) => {
      setIsFiltered(filtered);
      setFilteredCollections(results);
    },
    []
  );

  const handleGroupFilterChange = useCallback(
    (group: string | null) => {
      updateURLParams({ group });
    },
    [updateURLParams]
  );

  const handleTypeFilterChange = useCallback(
    (type: string | null) => {
      updateURLParams({ type });
    },
    [updateURLParams]
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      updateURLParams({ q: query || null });
    },
    [updateURLParams]
  );

  const handleClearFilters = useCallback(() => {
    updateURLParams({ q: null, type: null, group: null });
  }, [updateURLParams]);

  const { data: allCollections = [], isLoading } = useQuery<CollectionWithImages[]>({
    queryKey: [...collectionsQueryKeys.list(), { includeUnpublished: isAuthenticated }],
    queryFn: async () => {
      const response = await fetch('/api/v1/collections');
      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }
      const result = await response.json();
      return result.data || [];
    },
    // Wait for auth so we don't fetch once as anonymous and again once the key flips
    enabled: !authLoading,
  });

  // Filter collections by type if filterType is provided
  const collections = useMemo(
    () =>
      filterType ? allCollections.filter((c) => c.type === filterType) : allCollections,
    [allCollections, filterType]
  );

  const { data: groups = [] } = useQuery<CollectionGroup[]>({
    queryKey: collectionGroupsQueryKeys.all,
    queryFn: async () => {
      const response = await fetch('/api/v1/collection-groups');
      if (!response.ok) throw new Error('Failed to fetch groups');
      const result = await response.json();
      return result.data as CollectionGroup[];
    },
    enabled: addDialogOpen || editDialogOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const collection = collections.find((c) => c.id === collectionId);
      const response = await fetch('/api/v1/collections', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: collectionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete ${itemTypeName}`);
      }

      return collection?.title || itemTypeName;
    },
    onSuccess: (collectionName) => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.all });
      toast.success(`${collectionName} deleted`, {
        description: `${collectionName} has been deleted successfully.`,
      });
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete ${itemTypeName}`, {
        description: error.message,
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const collection = collections.find((c) => c.id === collectionId);
      if (!collection) {
        throw new Error(`${itemTypeName} not found`);
      }

      const response = await fetch('/api/v1/collections', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: collectionId,
          is_published: !collection.is_published,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to update ${itemTypeName}`);
      }

      return {
        newPublishedState: !collection.is_published,
        collectionName: collection.title,
      };
    },
    onSuccess: ({ newPublishedState, collectionName }) => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.all });
      toast.success(
        newPublishedState
          ? `${collectionName} published`
          : `${collectionName} unpublished`,
        {
          description: newPublishedState
            ? `${collectionName} is now visible to everyone.`
            : `${collectionName} is now hidden from public view.`,
        }
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to update ${itemTypeName}`, {
        description: error.message,
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await fetch(`/api/v1/collection-groups/${groupId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete group');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionGroupsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.all });
      toast.success('Group deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete group', { description: error.message });
    },
  });

  const handleDeleteGroup = (groupId: string) => {
    deleteGroupMutation.mutate(groupId);
  };

  const handleEdit = (collection: CollectionWithImages) => {
    setSelectedCollection(collection);
    setEditDialogOpen(true);
  };

  const handleDelete = (collectionId: string) => {
    setCollectionToDelete(collectionId);
    setDeleteDialogOpen(true);
  };

  const handlePublish = (collectionId: string) => {
    publishMutation.mutate(collectionId);
  };

  const confirmDelete = () => {
    if (collectionToDelete) {
      deleteMutation.mutate(collectionToDelete);
    }
  };

  // Group collections by collection_group_name
  const groupedCollections = useMemo(() => {
    const groups: Record<string, CollectionWithImages[]> = {};

    collections.forEach((collection) => {
      const groupName = collection.collection_group_name || 'Ungrouped';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(collection);
    });

    return groups;
  }, [collections]);

  const groupNames = useMemo(() => {
    return Object.keys(groupedCollections).filter((name) => name !== 'Ungrouped');
  }, [groupedCollections]);

  const typeNames = useMemo(() => {
    const types = new Set<string>();
    collections.forEach((collection) => {
      if (collection.type) {
        types.add(collection.type);
      }
    });
    return Array.from(types).sort();
  }, [collections]);

  const hasActiveFilters = isFiltered || !!typeFilter || !!groupFilter;
  const showDefaultView = showGroupsAndUnique && !hasActiveFilters;
  const ungroupedCollections = groupedCollections['Ungrouped'];
  const hasUngroupedCollections = ungroupedCollections && ungroupedCollections.length > 0;

  if (authLoading || isLoading) {
    return <CollectionsLoading animate={false} />;
  }

  return (
    <div className='pt-18'>
      <div
        className='container mx-auto border-x-2 border-dashed text-center space-y-4 py-8'
      >
        <Text variant='hd-xxl' className={`fade-in-from-bottom ${getDelayClass(0)}`}>
          {title}
        </Text>
        <Text
          variant='bd-lg'
          className={`text-muted-foreground max-w-2xl mx-auto fade-in-from-bottom
            ${getDelayClass(1)}`}
        >
          {description}
        </Text>
      </div>
      <Separator className='border' />
      <div className='container mx-auto px-4 py-4 border-dashed border-x-2'>
        {/* Add Button - Only for authenticated users */}
        {isAuthenticated && (
          <div
            className={`mb-6 flex justify-center fade-in-from-bottom ${getDelayClass(2)}`}
          >
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus />
              {addButtonText}
            </Button>
          </div>
        )}
        {/* Search Bar */}
        <div className={`mb-6 fade-in-from-bottom ${getDelayClass(3)}`}>
          <SearchAndFilterBar
            items={collections}
            searchKeys={['title', 'description', 'slug', 'collection_group_name']}
            onFilteredResults={handleFilteredResults}
            placeholder={`Search ${countLabel}...`}
            countLabel={countLabel}
            searchQuery={searchQuery}
            typeFilter={filterType ? null : typeFilter}
            availableTypes={filterType ? [] : typeNames}
            groupFilter={showGroupsAndUnique ? groupFilter : null}
            availableGroups={showGroupsAndUnique ? groupNames : []}
            pageFilterType={filterType}
            onSearchChange={handleSearchChange}
            onTypeFilterChange={filterType ? undefined : handleTypeFilterChange}
            onGroupFilterChange={
              showGroupsAndUnique ? handleGroupFilterChange : undefined
            }
            onClearFilters={handleClearFilters}
          />
        </div>
        {/* Collection Groups - Show when not filtered and groups exist */}
        {showDefaultView && groupNames.length > 0 && (
          <>
            <div className='mb-4'>
              <Text variant='hd-lg' className='mb-4'>
                Collection Groups
              </Text>
            </div>
            <div
              className='container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6
                mb-12'
            >
              {groupNames
                .sort((a, b) => a.localeCompare(b))
                .map((groupName, index) => (
                  <CollectionGroupCard
                    key={groupName}
                    groupName={groupName}
                    collections={groupedCollections[groupName]}
                    className={`fade-in-from-bottom ${getDelayClass(index)}`}
                    onClick={() => handleGroupFilterChange(groupName)}
                  />
                ))}
            </div>
          </>
        )}
        {/* Unique Collection - Show ungrouped collections when not filtered */}
        {showDefaultView && hasUngroupedCollections && (
          <>
            <div className='mb-4'>
              <Text variant='hd-lg' className='mb-4'>
                Unique Collections
              </Text>
            </div>
            <div
              className='container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6
                mb-12'
            >
              {ungroupedCollections.map((collection, index) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  className={`h-full fade-in-from-bottom ${getDelayClass(index)}`}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPublish={handlePublish}
                />
              ))}
            </div>
          </>
        )}

        {/* Show "All Collections" header only when filtering/searching */}
        {hasActiveFilters && (
          <div className='mb-4'>
            <Text variant='hd-lg' className='mb-4'>
              All Collections
            </Text>
          </div>
        )}

        {/* Show CollectionGrid when filtering/searching OR when not using groups mode */}
        {(hasActiveFilters || !showGroupsAndUnique) && (
          <CollectionGrid
            collections={hasActiveFilters ? filteredCollections : collections}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPublish={handlePublish}
            isFiltered={hasActiveFilters}
          />
        )}

        <CollectionForm
          mode='add'
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          groups={groups}
          onDeleteGroup={handleDeleteGroup}
          defaultType={filterType || 'event'}
        />
        {selectedCollection && (
          <CollectionForm
            mode='edit'
            collection={selectedCollection}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            groups={groups}
            onDeleteGroup={handleDeleteGroup}
          />
        )}
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this{' '}
                {itemTypeName} and all its images.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className='bg-destructive text-destructive-foreground
                  hover:bg-destructive/90'
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

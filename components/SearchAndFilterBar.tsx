'use client';

import { Button } from '@/components/animate-ui/components/';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import Fuse, { type FuseResult } from 'fuse.js';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

// Type helper for items that might have these properties
type SortableItem = {
  title?: string;
  date?: string;
  type?: string;
  collection_group_name?: string;
};

interface SearchAndFilterBarProps<T> {
  items: T[];
  searchKeys: string[];
  onFilteredResults: (results: T[], isFiltered: boolean) => void;
  placeholder?: string;
  countLabel?: string;
  className?: string;
  // URL-based filter state
  searchQuery?: string;
  typeFilter?: string | null;
  availableTypes?: string[];
  groupFilter?: string | null;
  availableGroups?: string[];
  pageFilterType?: string | null; // Page-level filter (not URL param)
  // Callbacks to update URL params
  onSearchChange?: (query: string) => void;
  onTypeFilterChange?: (type: string | null) => void;
  onGroupFilterChange?: (group: string | null) => void;
  onClearFilters?: () => void; // Single callback to clear all filters
}

export function SearchAndFilterBar<T>({
  items,
  searchKeys,
  onFilteredResults,
  placeholder = 'Search...',
  countLabel = 'items',
  className = '',
  searchQuery: propSearchQuery = '',
  typeFilter = null,
  availableTypes = [],
  groupFilter = null,
  availableGroups = [],
  pageFilterType = null,
  onSearchChange,
  onTypeFilterChange,
  onGroupFilterChange,
  onClearFilters,
}: SearchAndFilterBarProps<T>) {
  // Use local state for immediate UI updates, sync with props
  const [localSearchQuery, setLocalSearchQuery] = useState(propSearchQuery);
  const [prevPropSearchQuery, setPrevPropSearchQuery] = useState(propSearchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(localSearchQuery, 300);
  const prevQueryRef = useRef<string | undefined>(undefined);
  const prevTypeFilterRef = useRef<string | null | undefined>(undefined);
  const prevGroupFilterRef = useRef<string | null | undefined>(undefined);
  const prevItemsRef = useRef<T[] | undefined>(undefined);

  // Adjust local state when the prop changes externally (React-recommended pattern)
  if (propSearchQuery !== prevPropSearchQuery) {
    setPrevPropSearchQuery(propSearchQuery);
    setLocalSearchQuery(propSearchQuery);
  }

  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: searchKeys,
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [items, searchKeys]);

  // Sync debounced query to URL via callback
  useEffect(() => {
    // Skip sync if we just cleared but debounce hasn't caught up yet
    if (!localSearchQuery && debouncedQuery) {
      return;
    }
    // Skip sync if both are empty (prevents re-adding cleared search)
    if (!debouncedQuery && !propSearchQuery) {
      return;
    }
    if (debouncedQuery !== propSearchQuery) {
      onSearchChange?.(debouncedQuery);
    }
  }, [debouncedQuery, onSearchChange, propSearchQuery, localSearchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on "/"
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Clear search on "Escape"
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setLocalSearchQuery('');
        onSearchChange?.('');
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchChange]);

  // Apply search, type filter, and group filter
  useEffect(() => {
    // Skip if nothing has changed
    if (
      prevQueryRef.current === debouncedQuery &&
      prevTypeFilterRef.current === typeFilter &&
      prevGroupFilterRef.current === groupFilter &&
      prevItemsRef.current === items
    ) {
      return;
    }
    prevQueryRef.current = debouncedQuery;
    prevTypeFilterRef.current = typeFilter;
    prevGroupFilterRef.current = groupFilter;
    prevItemsRef.current = items;

    let results: T[] = [];
    const isSearching = debouncedQuery.trim().length > 0;

    if (isSearching) {
      const searchResults = fuse.search(debouncedQuery);
      results = searchResults.map((result: FuseResult<T>) => result.item);
    } else {
      results = [...items];
    }

    // Apply type filter
    if (typeFilter) {
      results = results.filter(
        (item) => (item as unknown as SortableItem).type === typeFilter
      );
    }

    // Apply group filter
    if (groupFilter) {
      results = results.filter(
        (item) => (item as unknown as SortableItem).collection_group_name === groupFilter
      );
    }

    onFilteredResults(results, isSearching || !!typeFilter || !!groupFilter);
  }, [debouncedQuery, fuse, onFilteredResults, items, typeFilter, groupFilter]);

  const displayedCount = useMemo(() => {
    let count = items.length;

    if (debouncedQuery.trim()) {
      count = fuse.search(debouncedQuery).length;
    }

    if (typeFilter || groupFilter) {
      let filtered = items;

      if (typeFilter) {
        filtered = filtered.filter(
          (item) => (item as unknown as SortableItem).type === typeFilter
        );
      }

      if (groupFilter) {
        filtered = filtered.filter(
          (item) =>
            (item as unknown as SortableItem).collection_group_name === groupFilter
        );
      }

      count = debouncedQuery.trim()
        ? fuse.search(debouncedQuery).filter((result) => {
            const item = result.item as unknown as SortableItem;
            const matchesType = !typeFilter || item.type === typeFilter;
            const matchesGroup =
              !groupFilter || item.collection_group_name === groupFilter;
            return matchesType && matchesGroup;
          }).length
        : filtered.length;
    }

    return count;
  }, [debouncedQuery, items, fuse, typeFilter, groupFilter]);

  const handleClearFilters = () => {
    setLocalSearchQuery('');
    if (onClearFilters) {
      // Use the dedicated clear handler if provided (clears all in one go)
      onClearFilters();
    } else {
      // Fallback to individual handlers
      onSearchChange?.('');
      onTypeFilterChange?.(null);
      onGroupFilterChange?.(null);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className='flex flex-col items-center gap-3 w-full md:w-1/2 justify-center'>
        {/* Search Input */}
        <div className='relative w-full md:w-2/3'>
          <Search
            className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4
              text-muted-foreground'
          />
          <Input
            ref={inputRef}
            type='text'
            placeholder={placeholder}
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className='text-center pl-10 pr-10'
          />
          {localSearchQuery && (
            <X
              className='absolute right-3 top-1/2 transform -translate-y-1/2 size-5
                text-muted-foreground cursor-pointer hover:text-foreground
                transition-colors'
              onClick={() => {
                setLocalSearchQuery('');
                inputRef.current?.blur();
              }}
            />
          )}
        </div>
        <div className='flex items-center gap-2 w-full sm:w-2/3 justify-center'>
          {/* Type Filter - Only show if available */}
          {availableTypes.length > 0 && onTypeFilterChange && (
            <Select
              value={typeFilter || 'all'}
              onValueChange={(value) =>
                onTypeFilterChange(value === 'all' ? null : value)
              }
            >
              <SelectTrigger className='w-full [&>span]:flex-1 [&>span]:text-center'>
                <SelectValue placeholder='Type' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Type</SelectLabel>
                  <SelectItem value='all'>All Types</SelectItem>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}

          {/* Group Filter - Only show if available */}
          {availableGroups.length > 0 && onGroupFilterChange && (
            <Select
              value={groupFilter || 'all'}
              onValueChange={(value) =>
                onGroupFilterChange(value === 'all' ? null : value)
              }
            >
              <SelectTrigger className='w-full [&>span]:flex-1 [&>span]:text-center'>
                <SelectValue placeholder='Group by' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Group by</SelectLabel>
                  <SelectItem value='all'>All Groups</SelectItem>
                  {availableGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Results Badge */}
      <Badge variant='secondary' className='shrink-0'>
        {displayedCount} {countLabel}
        {debouncedQuery && ` found for "${debouncedQuery}"`}
        {(typeFilter || pageFilterType) &&
          ` of type "${(typeFilter || pageFilterType)!.charAt(0).toUpperCase() + (typeFilter || pageFilterType)!.slice(1)}"`}
        {groupFilter && ` in "${groupFilter}"`}
      </Badge>

      {/* Clear Filters Button */}
      {(debouncedQuery || typeFilter || groupFilter) && (
        <Button variant='outline' size='sm' onClick={handleClearFilters}>
          <X className='size-4' />
          Clear all filters
        </Button>
      )}
    </div>
  );
}

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Filter, SortAsc, SortDesc } from 'lucide-react';

interface DashboardFiltersProps {
  filters: {
    status: 'all' | 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
    fileType: 'all' | 'image' | 'video';
    sortBy: 'createdAt' | 'status' | 'filename';
    sortOrder: 'asc' | 'desc';
  };
  onFiltersChange: (filters: any) => void;
}

export function DashboardFilters({ filters, onFiltersChange }: DashboardFiltersProps) {
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'queued', label: 'Queued' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' }
  ];

  const fileTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Videos' }
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Date Created' },
    { value: 'status', label: 'Status' },
    { value: 'filename', label: 'Filename' }
  ];

  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleSortOrder = () => {
    updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const resetFilters = () => {
    onFiltersChange({
      status: 'all',
      fileType: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  const getStatusLabel = (status: string) => {
    return statusOptions.find(option => option.value === status)?.label || 'All Status';
  };

  const getFileTypeLabel = (fileType: string) => {
    return fileTypeOptions.find(option => option.value === fileType)?.label || 'All Types';
  };

  const getSortLabel = (sortBy: string) => {
    return sortOptions.find(option => option.value === sortBy)?.label || 'Date Created';
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {getStatusLabel(filters.status)}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {statusOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => updateFilter('status', option.value)}
                  className={filters.status === option.value ? 'bg-gray-100' : ''}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* File Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {getFileTypeLabel(filters.fileType)}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {fileTypeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => updateFilter('fileType', option.value)}
                  className={filters.fileType === option.value ? 'bg-gray-100' : ''}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort By */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort by {getSortLabel(filters.sortBy)}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => updateFilter('sortBy', option.value)}
                  className={filters.sortBy === option.value ? 'bg-gray-100' : ''}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Order */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortOrder}
          >
            {filters.sortOrder === 'asc' ? (
              <>
                <SortAsc className="mr-2 h-4 w-4" />
                Ascending
              </>
            ) : (
              <>
                <SortDesc className="mr-2 h-4 w-4" />
                Descending
              </>
            )}
          </Button>

          {/* Reset Filters */}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

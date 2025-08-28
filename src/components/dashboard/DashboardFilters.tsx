'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, X } from 'lucide-react';

interface DashboardFiltersProps {
  filters: {
    search: string;
    status: string;
    type: string;
    dateRange: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

export function DashboardFilters({ filters, onFilterChange, onClearFilters }: DashboardFiltersProps) {
  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <Card className="bg-white/10 backdrop-blur-md border border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Search Files</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by filename..."
                value={filters.search}
                onChange={(e) => onFilterChange('search', e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-white/40"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Status</label>
            <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-white/40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/20">
                <SelectItem value="" className="text-white hover:bg-slate-700">All statuses</SelectItem>
                <SelectItem value="completed" className="text-white hover:bg-slate-700">Completed</SelectItem>
                <SelectItem value="processing" className="text-white hover:bg-slate-700">Processing</SelectItem>
                <SelectItem value="failed" className="text-white hover:bg-slate-700">Failed</SelectItem>
                <SelectItem value="pending" className="text-white hover:bg-slate-700">Pending</SelectItem>
                <SelectItem value="queued" className="text-white hover:bg-slate-700">Queued</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">File Type</label>
            <Select value={filters.type} onValueChange={(value) => onFilterChange('type', value)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-white/40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/20">
                <SelectItem value="" className="text-white hover:bg-slate-700">All types</SelectItem>
                <SelectItem value="image" className="text-white hover:bg-slate-700">Images</SelectItem>
                <SelectItem value="video" className="text-white hover:bg-slate-700">Videos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Date Range</label>
            <Select value={filters.dateRange} onValueChange={(value) => onFilterChange('dateRange', value)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-white/40">
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/20">
                <SelectItem value="" className="text-white hover:bg-slate-700">All time</SelectItem>
                <SelectItem value="today" className="text-white hover:bg-slate-700">Today</SelectItem>
                <SelectItem value="week" className="text-white hover:bg-slate-700">This week</SelectItem>
                <SelectItem value="month" className="text-white hover:bg-slate-700">This month</SelectItem>
                <SelectItem value="year" className="text-white hover:bg-slate-700">This year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="text-slate-300 border-white/20 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

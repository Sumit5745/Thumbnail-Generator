'use client';

import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

interface DashboardStatsProps {
  stats?: {
    total: number;
    completed: number;
    processing: number;
    failed: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  // Default values if stats is undefined
  const defaultStats = {
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0
  };

  const currentStats = stats || defaultStats;

  const getCompletionRate = () => {
    if (currentStats.total === 0) return 0;
    return Math.round((currentStats.completed / currentStats.total) * 100);
  };

  const getSuccessRate = () => {
    if (currentStats.total === 0) return 0;
    return Math.round((currentStats.completed / (currentStats.completed + currentStats.failed)) * 100);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Total Files */}
      <Card className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:-translate-y-2 transition-all duration-500 hover:bg-white/15">
        <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl mx-auto mb-4 shadow-lg border border-blue-500/30">
          <BarChart3 className="h-7 w-7 text-blue-400" />
        </div>
        <h3 className="text-3xl font-bold text-white mb-2 text-center">{currentStats.total}</h3>
        <p className="text-slate-300 font-medium text-center">Total Files Processed</p>
      </Card>

      {/* Completed Files */}
      <Card className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:-translate-y-2 transition-all duration-500 hover:bg-white/15">
        <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl mx-auto mb-4 shadow-lg border border-green-500/30">
          <CheckCircle className="h-7 w-7 text-green-400" />
        </div>
        <h3 className="text-3xl font-bold text-white mb-2 text-center">{currentStats.completed}</h3>
        <p className="text-slate-300 font-medium text-center">Successfully Completed</p>
        <p className="text-xs text-green-400 mt-1 text-center">
          {getCompletionRate()}% completion rate
        </p>
      </Card>

      {/* Processing Files */}
      <Card className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:-translate-y-2 transition-all duration-500 hover:bg-white/15">
        <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl mx-auto mb-4 shadow-lg border border-orange-500/30">
          <Clock className="h-7 w-7 text-orange-400" />
        </div>
        <h3 className="text-3xl font-bold text-white mb-2 text-center">{currentStats.processing}</h3>
        <p className="text-slate-300 font-medium text-center">Currently Processing</p>
      </Card>

      {/* Failed Files */}
      <Card className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:-translate-y-2 transition-all duration-500 hover:bg-white/15">
        <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl mx-auto mb-4 shadow-lg border border-red-500/30">
          <AlertCircle className="h-7 w-7 text-red-400" />
        </div>
        <h3 className="text-3xl font-bold text-white mb-2 text-center">{currentStats.failed}</h3>
        <p className="text-slate-300 font-medium text-center">Failed Jobs</p>
        <p className="text-xs text-red-400 mt-1 text-center">
          {getSuccessRate()}% success rate
        </p>
      </Card>
    </div>
  );
}

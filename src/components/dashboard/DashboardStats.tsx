'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, 
  Clock, 
  Loader2, 
  XCircle, 
  FileText,
  TrendingUp
} from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    total: number;
    pending: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      title: 'Total Jobs',
      value: stats.total,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Processing',
      value: stats.processing,
      icon: Loader2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      animate: stats.processing > 0
    },
    {
      title: 'Queued',
      value: stats.queued,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Failed',
      value: stats.failed,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ];

  const successRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon 
                    className={`h-4 w-4 ${stat.color} ${stat.animate ? 'animate-spin' : ''}`} 
                  />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {/* Success Rate Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-purple-100">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{successRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

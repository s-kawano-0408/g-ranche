import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'teal' | 'blue' | 'orange' | 'purple';
  description?: string;
}

const colorMap = {
  teal: {
    bg: 'bg-teal-50',
    icon: 'text-teal-600',
    value: 'text-teal-700',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    value: 'text-blue-700',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    value: 'text-orange-700',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    value: 'text-purple-700',
  },
};

export default function StatsCard({ title, value, icon: Icon, color, description }: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={cn('p-2 sm:p-3 rounded-xl', colors.bg)}>
          <Icon size={20} className={cn(colors.icon, 'sm:w-6 sm:h-6')} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{title}</p>
          <p className={cn('text-2xl sm:text-3xl font-bold mt-1', colors.value)}>{value}</p>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib';
import { getDelayClass } from '@/utils/animations';

type EmptyStateSize = 'sm' | 'md' | 'lg' | 'xl';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  bordered?: boolean;
  className?: string;
  buttonText?: string;
  buttonHref?: string;
  buttonIcon?: LucideIcon;
  size?: EmptyStateSize;
}

const sizeConfig = {
  sm: {
    icon: 'size-12',
    spacing: 'space-y-3',
    button: 'mt-3',
  },
  md: {
    icon: 'size-16',
    spacing: 'space-y-4',
    button: 'mt-4',
  },
  lg: {
    icon: 'size-20',
    spacing: 'space-y-5',
    button: 'mt-5',
  },
  xl: {
    icon: 'size-24',
    spacing: 'space-y-6',
    button: 'mt-6',
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  bordered = false,
  className,
  buttonText,
  buttonHref,
  buttonIcon: ButtonIcon,
  size = 'lg',
}: EmptyStateProps) {
  const config = sizeConfig[size];

  return (
    <Empty
      className={cn(
        className,
        { 'border-2 rounded border-dashed': bordered },
        `fade-in-from-bottom ${getDelayClass(3)}`
      )}
    >
      <EmptyHeader className={config.spacing}>
        <EmptyMedia
          variant='icon'
          className={`flex h-auto w-auto p-4 fade-in-from-bottom ${getDelayClass(4)}`}
        >
          <Icon className={config.icon} />
        </EmptyMedia>
        <EmptyTitle className={`mb-0 fade-in-from-bottom ${getDelayClass(5)}`}>
          {title}
        </EmptyTitle>
        <EmptyDescription className={`fade-in-from-bottom ${getDelayClass(6)}`}>
          {description}
        </EmptyDescription>
        {buttonText && buttonHref && (
          <Link className={`fade-in-from-bottom ${getDelayClass(7)}`} href={buttonHref}>
            <Button className={config.button}>
              {ButtonIcon && <ButtonIcon />}
              {buttonText}
            </Button>
          </Link>
        )}
      </EmptyHeader>
    </Empty>
  );
}

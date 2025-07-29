import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ArrowLeft, Home, User, Settings, HelpCircle } from 'lucide-react';
interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backPath?: string;
  actions?: React.ReactNode;
}
const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBackButton = true,
  backPath = '/dashboard',
  actions
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{
      label: 'Dashboard',
      path: '/dashboard',
      icon: Home
    }];
    if (pathSegments.length > 0) {
      const currentPath = pathSegments[pathSegments.length - 1];
      const pathMap: Record<string, string> = {
        'workflow': 'Workflow Builder',
        'monitoring': 'System Monitoring',
        'settings': 'Settings',
        'live-desktop': 'Live Desktop'
      };
      if (pathMap[currentPath]) {
        breadcrumbs.push({
          label: pathMap[currentPath],
          path: location.pathname,
          icon: undefined
        });
      }
    }
    return breadcrumbs;
  };
  const breadcrumbs = getBreadcrumbs();

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'h':
            e.preventDefault();
            navigate('/dashboard');
            break;
          case 'm':
            e.preventDefault();
            navigate('/monitoring');
            break;
          case ',':
            e.preventDefault();
            navigate('/settings');
            break;
        }
      }
      if (e.key === 'Escape' && showBackButton) {
        navigate(backPath);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showBackButton, backPath]);
  return;
};
export default AppHeader;
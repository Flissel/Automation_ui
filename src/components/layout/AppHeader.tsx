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
    const breadcrumbs = [
      { label: 'Dashboard', path: '/dashboard', icon: Home }
    ];

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

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center space-x-4 flex-1">
        {showBackButton && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(backPath)}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}

        <div className="flex flex-col min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold truncate">{title}</h1>
            {subtitle && (
              <span className="text-sm text-muted-foreground truncate">
                {subtitle}
              </span>
            )}
          </div>
          
          <Breadcrumb className="mt-1">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      href={crumb.path}
                      className="flex items-center text-xs text-muted-foreground hover:text-foreground"
                    >
                      {crumb.icon && <crumb.icon className="w-3 h-3 mr-1" />}
                      {crumb.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {actions}
        
        <div className="flex items-center space-x-1 border-l pl-2 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings')}
            className="w-8 h-8 p-0"
            title="Settings (Ctrl+,)"
          >
            <Settings className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
            title="Help (F1)"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
            title="Profile"
          >
            <User className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
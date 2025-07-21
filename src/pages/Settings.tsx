import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings as SettingsIcon, User, Shield, Bell, Palette } from 'lucide-react';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  const settingsCategories = [
    {
      title: 'Profile Settings',
      description: 'Manage your account and personal preferences',
      icon: <User className="w-6 h-6" />,
      items: ['Personal Information', 'Email Preferences', 'Password Management']
    },
    {
      title: 'Security & Privacy',
      description: 'Configure security settings and privacy options',
      icon: <Shield className="w-6 h-6" />,
      items: ['Two-Factor Authentication', 'Session Management', 'API Keys']
    },
    {
      title: 'Notifications',
      description: 'Control how and when you receive notifications',
      icon: <Bell className="w-6 h-6" />,
      items: ['Email Notifications', 'Desktop Alerts', 'Mobile Push']
    },
    {
      title: 'Appearance',
      description: 'Customize the look and feel of your interface',
      icon: <Palette className="w-6 h-6" />,
      items: ['Theme Selection', 'Color Scheme', 'Layout Preferences']
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your TRAE platform configuration and preferences</p>
          </div>
        </div>

        {/* Settings Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {settingsCategories.map((category, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="text-primary">{category.icon}</div>
                  <span>{category.title}</span>
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm text-muted-foreground flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coming Soon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SettingsIcon className="w-6 h-6" />
              <span>Advanced Configuration</span>
            </CardTitle>
            <CardDescription>Comprehensive platform configuration options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <SettingsIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Configuration Panel Coming Soon</h3>
              <p className="text-muted-foreground mb-6">
                A comprehensive settings interface is being developed to give you full control over your TRAE automation platform.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left max-w-2xl mx-auto">
                <div className="space-y-2">
                  <h4 className="font-medium">System Configuration</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span>Connection settings</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span>Performance tuning</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span>Resource limits</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">User Management</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span>Role-based access</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span>Permission management</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span>Audit logging</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
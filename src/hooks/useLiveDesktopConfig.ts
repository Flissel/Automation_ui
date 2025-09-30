/**
 * Custom hook for managing Live Desktop configurations
 * Integrates with Supabase for persistent storage
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LiveDesktopConfig } from '@/types/liveDesktop';
import { useToast } from '@/hooks/use-toast';

export const useLiveDesktopConfig = () => {
  const [configs, setConfigs] = useState<LiveDesktopConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load configurations from Supabase
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('live_desktop_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedConfigs = (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        websocketUrl: '', // Will be populated from config
        ...(row.configuration as any),
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
        category: row.category || undefined,
      }));

      setConfigs(typedConfigs);
      setError(null);
    } catch (err: any) {
      console.error('Error loading configs:', err);
      setError(err.message);
      toast({
        title: 'Error loading configurations',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new configuration
  const createConfig = async (config: Partial<LiveDesktopConfig>) => {
    try {
      const { data, error } = await supabase
        .from('live_desktop_configs')
        .insert({
          name: config.name || 'New Configuration',
          description: config.description,
          category: config.category,
          configuration: config as any,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Configuration created',
        description: `Configuration "${data.name}" has been created successfully.`,
      });

      await loadConfigs();
      return data;
    } catch (err: any) {
      console.error('Error creating config:', err);
      toast({
        title: 'Error creating configuration',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Update existing configuration
  const updateConfig = async (id: string, updates: Partial<LiveDesktopConfig>) => {
    try {
      const { error } = await supabase
        .from('live_desktop_configs')
        .update({
          name: updates.name,
          description: updates.description,
          category: updates.category,
          configuration: updates as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Configuration updated',
        description: 'Configuration has been updated successfully.',
      });

      await loadConfigs();
    } catch (err: any) {
      console.error('Error updating config:', err);
      toast({
        title: 'Error updating configuration',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Delete configuration
  const deleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('live_desktop_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Configuration deleted',
        description: 'Configuration has been deleted successfully.',
      });

      await loadConfigs();
    } catch (err: any) {
      console.error('Error deleting config:', err);
      toast({
        title: 'Error deleting configuration',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Toggle configuration active status
  const toggleConfigActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('live_desktop_configs')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      await loadConfigs();
    } catch (err: any) {
      console.error('Error toggling config:', err);
      throw err;
    }
  };

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, []);

  return {
    configs,
    loading,
    error,
    loadConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    toggleConfigActive,
  };
};

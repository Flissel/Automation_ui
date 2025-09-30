/**
 * Live Desktop Service
 * Handles all API operations for Live Desktop functionality
 */

import { supabase } from '@/integrations/supabase/client';
import { LiveDesktopConfig, OCRRegion } from '@/types/liveDesktop';
import { WEBSOCKET_CONFIG } from '@/config/websocketConfig';

export class LiveDesktopService {
  /**
   * Get all live desktop configurations
   */
  static async getConfigs(): Promise<LiveDesktopConfig[]> {
    const { data, error } = await supabase
      .from('live_desktop_configs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      websocketUrl: `${WEBSOCKET_CONFIG.BASE_URL}${WEBSOCKET_CONFIG.ENDPOINTS.LIVE_DESKTOP}`,
      ...(row.configuration as any),
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
      category: row.category || undefined,
    }));
  }

  /**
   * Get a single configuration by ID
   */
  static async getConfig(id: string): Promise<LiveDesktopConfig | null> {
    const { data, error } = await supabase
      .from('live_desktop_configs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      websocketUrl: `${WEBSOCKET_CONFIG.BASE_URL}${WEBSOCKET_CONFIG.ENDPOINTS.LIVE_DESKTOP}`,
      ...(data.configuration as any),
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
      category: data.category || undefined,
    };
  }

  /**
   * Create a new configuration
   */
  static async createConfig(config: Partial<LiveDesktopConfig>): Promise<LiveDesktopConfig> {
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

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      websocketUrl: `${WEBSOCKET_CONFIG.BASE_URL}${WEBSOCKET_CONFIG.ENDPOINTS.LIVE_DESKTOP}`,
      ...(data.configuration as any),
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
      category: data.category || undefined,
    };
  }

  /**
   * Update an existing configuration
   */
  static async updateConfig(id: string, updates: Partial<LiveDesktopConfig>): Promise<void> {
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
  }

  /**
   * Delete a configuration
   */
  static async deleteConfig(id: string): Promise<void> {
    const { error } = await supabase
      .from('live_desktop_configs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get active configurations
   */
  static async getActiveConfigs(): Promise<LiveDesktopConfig[]> {
    const { data, error } = await supabase
      .from('live_desktop_configs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      websocketUrl: `${WEBSOCKET_CONFIG.BASE_URL}${WEBSOCKET_CONFIG.ENDPOINTS.LIVE_DESKTOP}`,
      ...(row.configuration as any),
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
      category: row.category || undefined,
    }));
  }

  /**
   * Update OCR regions for a configuration
   */
  static async updateOCRRegions(configId: string, regions: OCRRegion[]): Promise<void> {
    const config = await this.getConfig(configId);
    if (!config) throw new Error('Configuration not found');

    config.ocrRegions = regions;
    await this.updateConfig(configId, config);
  }

  /**
   * Toggle configuration active status
   */
  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('live_desktop_configs')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get configurations by category
   */
  static async getConfigsByCategory(category: string): Promise<LiveDesktopConfig[]> {
    const { data, error } = await supabase
      .from('live_desktop_configs')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      websocketUrl: `${WEBSOCKET_CONFIG.BASE_URL}${WEBSOCKET_CONFIG.ENDPOINTS.LIVE_DESKTOP}`,
      ...(row.configuration as any),
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
      category: row.category || undefined,
    }));
  }
}

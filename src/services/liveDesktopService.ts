/**
 * Live Desktop Service
 * Handles all API operations for Live Desktop functionality
 */

import { supabase } from '@/integrations/supabase/client';
import { LiveDesktopConfig, OCRRegion } from '@/types/liveDesktop';
import { WEBSOCKET_CONFIG } from '@/config/websocketConfig';
import { safeExecute, transformError, ErrorCode } from '@/utils/errorHandling';

export class LiveDesktopService {
  /**
   * Get all live desktop configurations
   */
  static async getConfigs(): Promise<LiveDesktopConfig[]> {
    const result = await safeExecute(async () => {
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
    }, { operation: 'getConfigs' });

    if (result.error) {
      throw transformError(result.error, { operation: 'getConfigs' });
    }

    return result.data || [];
  }

  /**
   * Get a single configuration by ID
   */
  static async getConfig(id: string): Promise<LiveDesktopConfig | null> {
    const result = await safeExecute(async () => {
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
    }, { operation: 'getConfig', configId: id });

    if (result.error) {
      throw transformError(result.error, { operation: 'getConfig', configId: id });
    }

    return result.data ?? null;
  }

  /**
   * Create a new configuration
   */
  static async createConfig(config: Partial<LiveDesktopConfig>): Promise<LiveDesktopConfig> {
    const result = await safeExecute(async () => {
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
    }, { operation: 'createConfig', configName: config.name });

    if (result.error) {
      throw transformError(result.error, { operation: 'createConfig', configName: config.name });
    }

    if (!result.data) {
      throw transformError(new Error('Failed to create configuration'), { operation: 'createConfig' });
    }

    return result.data;
  }

  /**
   * Update an existing configuration
   */
  static async updateConfig(id: string, updates: Partial<LiveDesktopConfig>): Promise<void> {
    const result = await safeExecute(async () => {
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
    }, { operation: 'updateConfig', configId: id });

    if (result.error) {
      throw transformError(result.error, { operation: 'updateConfig', configId: id });
    }
  }

  /**
   * Delete a configuration
   */
  static async deleteConfig(id: string): Promise<void> {
    const result = await safeExecute(async () => {
      const { error } = await supabase
        .from('live_desktop_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, { operation: 'deleteConfig', configId: id });

    if (result.error) {
      throw transformError(result.error, { operation: 'deleteConfig', configId: id });
    }
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
    const result = await safeExecute(async () => {
      const config = await this.getConfig(configId);
      if (!config) {
        throw transformError(new Error('Configuration not found'), { 
          operation: 'updateOCRRegions', 
          configId,
          code: ErrorCode.NOT_FOUND 
        });
      }

      config.ocrRegions = regions;
      await this.updateConfig(configId, config);
    }, { operation: 'updateOCRRegions', configId, regionCount: regions.length });

    if (result.error) {
      throw transformError(result.error, { operation: 'updateOCRRegions', configId });
    }
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

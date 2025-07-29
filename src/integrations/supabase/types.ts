export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_assignments: {
        Row: {
          agent_type: string
          assigned_at: string | null
          branch_name: string
          created_at: string | null
          expires_at: string | null
          id: number
          session_id: string
          task_description: string | null
          updated_at: string | null
        }
        Insert: {
          agent_type: string
          assigned_at?: string | null
          branch_name: string
          created_at?: string | null
          expires_at?: string | null
          id?: number
          session_id: string
          task_description?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          assigned_at?: string | null
          branch_name?: string
          created_at?: string | null
          expires_at?: string | null
          id?: number
          session_id?: string
          task_description?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_assignments_branch_name_fkey"
            columns: ["branch_name"]
            isOneToOne: false
            referencedRelation: "git_branches"
            referencedColumns: ["branch_name"]
          },
        ]
      }
      chain_execution_logs: {
        Row: {
          actions_executed: Json | null
          chain_id: string
          created_at: string | null
          errors: string[] | null
          event_chain_id: string | null
          execution_duration_ms: number | null
          execution_time: string | null
          id: string
          listener_id: string | null
          success: boolean
          trigger_event: Json
        }
        Insert: {
          actions_executed?: Json | null
          chain_id: string
          created_at?: string | null
          errors?: string[] | null
          event_chain_id?: string | null
          execution_duration_ms?: number | null
          execution_time?: string | null
          id?: string
          listener_id?: string | null
          success: boolean
          trigger_event: Json
        }
        Update: {
          actions_executed?: Json | null
          chain_id?: string
          created_at?: string | null
          errors?: string[] | null
          event_chain_id?: string | null
          execution_duration_ms?: number | null
          execution_time?: string | null
          id?: string
          listener_id?: string | null
          success?: boolean
          trigger_event?: Json
        }
        Relationships: [
          {
            foreignKeyName: "chain_execution_logs_event_chain_id_fkey"
            columns: ["event_chain_id"]
            isOneToOne: false
            referencedRelation: "event_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_execution_logs_listener_id_fkey"
            columns: ["listener_id"]
            isOneToOne: false
            referencedRelation: "event_listeners"
            referencedColumns: ["id"]
          },
        ]
      }
      codebase_dependency_graph: {
        Row: {
          algorithm_version: string | null
          average_clustering: number | null
          bottleneck_nodes: string[] | null
          circular_dependencies: string[] | null
          critical_path: Json | null
          density: number | null
          edge_count: number | null
          generated_at: string | null
          generation_duration_ms: number | null
          graph_data: Json
          high_risk_nodes: string[] | null
          id: string
          max_depth: number | null
          modularity_score: number | null
          node_count: number | null
          project_id: string
        }
        Insert: {
          algorithm_version?: string | null
          average_clustering?: number | null
          bottleneck_nodes?: string[] | null
          circular_dependencies?: string[] | null
          critical_path?: Json | null
          density?: number | null
          edge_count?: number | null
          generated_at?: string | null
          generation_duration_ms?: number | null
          graph_data: Json
          high_risk_nodes?: string[] | null
          id?: string
          max_depth?: number | null
          modularity_score?: number | null
          node_count?: number | null
          project_id: string
        }
        Update: {
          algorithm_version?: string | null
          average_clustering?: number | null
          bottleneck_nodes?: string[] | null
          circular_dependencies?: string[] | null
          critical_path?: Json | null
          density?: number | null
          edge_count?: number | null
          generated_at?: string | null
          generation_duration_ms?: number | null
          graph_data?: Json
          high_risk_nodes?: string[] | null
          id?: string
          max_depth?: number | null
          modularity_score?: number | null
          node_count?: number | null
          project_id?: string
        }
        Relationships: []
      }
      codebase_relationship_analytics: {
        Row: {
          affected_files_count: number | null
          analysis_version: string | null
          breaking_change_risk: number | null
          centrality_score: number | null
          change_impact_score: number | null
          circular_dependencies: number | null
          cohesion_score: number | null
          complexity_score: number | null
          coupling_score: number | null
          dependency_depth: number | null
          id: string
          importance_rank: number | null
          incoming_dependencies: number | null
          last_analyzed: string | null
          maintainability_index: number | null
          outgoing_dependencies: number | null
          technical_debt_ratio: number | null
          vector_id: string
        }
        Insert: {
          affected_files_count?: number | null
          analysis_version?: string | null
          breaking_change_risk?: number | null
          centrality_score?: number | null
          change_impact_score?: number | null
          circular_dependencies?: number | null
          cohesion_score?: number | null
          complexity_score?: number | null
          coupling_score?: number | null
          dependency_depth?: number | null
          id?: string
          importance_rank?: number | null
          incoming_dependencies?: number | null
          last_analyzed?: string | null
          maintainability_index?: number | null
          outgoing_dependencies?: number | null
          technical_debt_ratio?: number | null
          vector_id: string
        }
        Update: {
          affected_files_count?: number | null
          analysis_version?: string | null
          breaking_change_risk?: number | null
          centrality_score?: number | null
          change_impact_score?: number | null
          circular_dependencies?: number | null
          cohesion_score?: number | null
          complexity_score?: number | null
          coupling_score?: number | null
          dependency_depth?: number | null
          id?: string
          importance_rank?: number | null
          incoming_dependencies?: number | null
          last_analyzed?: string | null
          maintainability_index?: number | null
          outgoing_dependencies?: number | null
          technical_debt_ratio?: number | null
          vector_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "codebase_relationship_analytics_vector_id_fkey"
            columns: ["vector_id"]
            isOneToOne: true
            referencedRelation: "code_hubs"
            referencedColumns: ["vector_id"]
          },
          {
            foreignKeyName: "codebase_relationship_analytics_vector_id_fkey"
            columns: ["vector_id"]
            isOneToOne: true
            referencedRelation: "codebase_vectors_master"
            referencedColumns: ["vector_id"]
          },
          {
            foreignKeyName: "codebase_relationship_analytics_vector_id_fkey"
            columns: ["vector_id"]
            isOneToOne: true
            referencedRelation: "critical_files"
            referencedColumns: ["vector_id"]
          },
        ]
      }
      codebase_relationships: {
        Row: {
          confidence: number | null
          context: Json | null
          created_at: string | null
          discovered_by: string | null
          id: string
          last_verified: string | null
          relationship_type: string
          source_code_snippet: string | null
          source_line_end: number | null
          source_line_start: number | null
          source_vector_id: string
          strength: number | null
          target_vector_id: string
          updated_at: string | null
        }
        Insert: {
          confidence?: number | null
          context?: Json | null
          created_at?: string | null
          discovered_by?: string | null
          id?: string
          last_verified?: string | null
          relationship_type: string
          source_code_snippet?: string | null
          source_line_end?: number | null
          source_line_start?: number | null
          source_vector_id: string
          strength?: number | null
          target_vector_id: string
          updated_at?: string | null
        }
        Update: {
          confidence?: number | null
          context?: Json | null
          created_at?: string | null
          discovered_by?: string | null
          id?: string
          last_verified?: string | null
          relationship_type?: string
          source_code_snippet?: string | null
          source_line_end?: number | null
          source_line_start?: number | null
          source_vector_id?: string
          strength?: number | null
          target_vector_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codebase_relationships_source_vector_id_fkey"
            columns: ["source_vector_id"]
            isOneToOne: false
            referencedRelation: "code_hubs"
            referencedColumns: ["vector_id"]
          },
          {
            foreignKeyName: "codebase_relationships_source_vector_id_fkey"
            columns: ["source_vector_id"]
            isOneToOne: false
            referencedRelation: "codebase_vectors_master"
            referencedColumns: ["vector_id"]
          },
          {
            foreignKeyName: "codebase_relationships_source_vector_id_fkey"
            columns: ["source_vector_id"]
            isOneToOne: false
            referencedRelation: "critical_files"
            referencedColumns: ["vector_id"]
          },
          {
            foreignKeyName: "codebase_relationships_target_vector_id_fkey"
            columns: ["target_vector_id"]
            isOneToOne: false
            referencedRelation: "code_hubs"
            referencedColumns: ["vector_id"]
          },
          {
            foreignKeyName: "codebase_relationships_target_vector_id_fkey"
            columns: ["target_vector_id"]
            isOneToOne: false
            referencedRelation: "codebase_vectors_master"
            referencedColumns: ["vector_id"]
          },
          {
            foreignKeyName: "codebase_relationships_target_vector_id_fkey"
            columns: ["target_vector_id"]
            isOneToOne: false
            referencedRelation: "critical_files"
            referencedColumns: ["vector_id"]
          },
        ]
      }
      codebase_vectors_api: {
        Row: {
          api_id: string
          api_type: string
          authentication_required: boolean | null
          deprecated: boolean | null
          description: string | null
          headers: Json | null
          id: string
          master_id: string | null
          metadata: Json | null
          method: string | null
          name: string
          parameters: Json | null
          path: string | null
          rate_limit: string | null
          request_schema: Json | null
          response_schema: Json | null
          version: string | null
        }
        Insert: {
          api_id: string
          api_type: string
          authentication_required?: boolean | null
          deprecated?: boolean | null
          description?: string | null
          headers?: Json | null
          id?: string
          master_id?: string | null
          metadata?: Json | null
          method?: string | null
          name: string
          parameters?: Json | null
          path?: string | null
          rate_limit?: string | null
          request_schema?: Json | null
          response_schema?: Json | null
          version?: string | null
        }
        Update: {
          api_id?: string
          api_type?: string
          authentication_required?: boolean | null
          deprecated?: boolean | null
          description?: string | null
          headers?: Json | null
          id?: string
          master_id?: string | null
          metadata?: Json | null
          method?: string | null
          name?: string
          parameters?: Json | null
          path?: string | null
          rate_limit?: string | null
          request_schema?: Json | null
          response_schema?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codebase_vectors_api_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "codebase_vectors_master"
            referencedColumns: ["id"]
          },
        ]
      }
      codebase_vectors_chat: {
        Row: {
          chat_id: string
          code_blocks: Json | null
          content: string
          context_window: Json | null
          conversation_id: string
          id: string
          master_id: string | null
          message_type: string | null
          metadata: Json | null
          related_files: string[] | null
          related_functions: string[] | null
          session_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          chat_id: string
          code_blocks?: Json | null
          content: string
          context_window?: Json | null
          conversation_id: string
          id?: string
          master_id?: string | null
          message_type?: string | null
          metadata?: Json | null
          related_files?: string[] | null
          related_functions?: string[] | null
          session_id?: string | null
          timestamp: string
          user_id?: string | null
        }
        Update: {
          chat_id?: string
          code_blocks?: Json | null
          content?: string
          context_window?: Json | null
          conversation_id?: string
          id?: string
          master_id?: string | null
          message_type?: string | null
          metadata?: Json | null
          related_files?: string[] | null
          related_functions?: string[] | null
          session_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codebase_vectors_chat_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "codebase_vectors_master"
            referencedColumns: ["id"]
          },
        ]
      }
      codebase_vectors_code: {
        Row: {
          chunk_id: string
          chunk_name: string
          chunk_type: string
          complexity_score: number | null
          content: string
          dependencies: Json | null
          end_line: number | null
          exports: string[] | null
          file_path: string
          id: string
          imports: string[] | null
          language: string
          master_id: string | null
          metadata: Json | null
          module_name: string | null
          parent_chunk_id: string | null
          service_name: string
          start_line: number | null
        }
        Insert: {
          chunk_id: string
          chunk_name: string
          chunk_type: string
          complexity_score?: number | null
          content: string
          dependencies?: Json | null
          end_line?: number | null
          exports?: string[] | null
          file_path: string
          id?: string
          imports?: string[] | null
          language: string
          master_id?: string | null
          metadata?: Json | null
          module_name?: string | null
          parent_chunk_id?: string | null
          service_name: string
          start_line?: number | null
        }
        Update: {
          chunk_id?: string
          chunk_name?: string
          chunk_type?: string
          complexity_score?: number | null
          content?: string
          dependencies?: Json | null
          end_line?: number | null
          exports?: string[] | null
          file_path?: string
          id?: string
          imports?: string[] | null
          language?: string
          master_id?: string | null
          metadata?: Json | null
          module_name?: string | null
          parent_chunk_id?: string | null
          service_name?: string
          start_line?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "codebase_vectors_code_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "codebase_vectors_master"
            referencedColumns: ["id"]
          },
        ]
      }
      codebase_vectors_config: {
        Row: {
          config_id: string
          config_name: string
          config_type: string
          content: string
          dependencies: Json | null
          environment: string | null
          file_path: string
          id: string
          master_id: string | null
          metadata: Json | null
          parsed_content: Json | null
          sensitive_keys: string[] | null
          validation_schema: Json | null
        }
        Insert: {
          config_id: string
          config_name: string
          config_type: string
          content: string
          dependencies?: Json | null
          environment?: string | null
          file_path: string
          id?: string
          master_id?: string | null
          metadata?: Json | null
          parsed_content?: Json | null
          sensitive_keys?: string[] | null
          validation_schema?: Json | null
        }
        Update: {
          config_id?: string
          config_name?: string
          config_type?: string
          content?: string
          dependencies?: Json | null
          environment?: string | null
          file_path?: string
          id?: string
          master_id?: string | null
          metadata?: Json | null
          parsed_content?: Json | null
          sensitive_keys?: string[] | null
          validation_schema?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "codebase_vectors_config_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "codebase_vectors_master"
            referencedColumns: ["id"]
          },
        ]
      }
      codebase_vectors_docs: {
        Row: {
          author: string | null
          content: string
          doc_id: string
          doc_type: string
          file_path: string | null
          id: string
          last_modified: string | null
          master_id: string | null
          metadata: Json | null
          related_code_chunks: string[] | null
          section_hierarchy: string[] | null
          tags: string[] | null
          title: string
        }
        Insert: {
          author?: string | null
          content: string
          doc_id: string
          doc_type: string
          file_path?: string | null
          id?: string
          last_modified?: string | null
          master_id?: string | null
          metadata?: Json | null
          related_code_chunks?: string[] | null
          section_hierarchy?: string[] | null
          tags?: string[] | null
          title: string
        }
        Update: {
          author?: string | null
          content?: string
          doc_id?: string
          doc_type?: string
          file_path?: string | null
          id?: string
          last_modified?: string | null
          master_id?: string | null
          metadata?: Json | null
          related_code_chunks?: string[] | null
          section_hierarchy?: string[] | null
          tags?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "codebase_vectors_docs_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "codebase_vectors_master"
            referencedColumns: ["id"]
          },
        ]
      }
      codebase_vectors_master: {
        Row: {
          created_at: string | null
          embedding: string | null
          embedding_model: string | null
          id: string
          last_accessed: string | null
          metadata: Json | null
          project_id: string
          search_count: number | null
          token_count: number | null
          updated_at: string | null
          vector_id: string
          vector_type: string
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          last_accessed?: string | null
          metadata?: Json | null
          project_id: string
          search_count?: number | null
          token_count?: number | null
          updated_at?: string | null
          vector_id: string
          vector_type: string
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          last_accessed?: string | null
          metadata?: Json | null
          project_id?: string
          search_count?: number | null
          token_count?: number | null
          updated_at?: string | null
          vector_id?: string
          vector_type?: string
        }
        Relationships: []
      }
      codebase_vectors_tests: {
        Row: {
          assertions: number | null
          coverage_percentage: number | null
          duration_ms: number | null
          file_path: string
          id: string
          last_run: string | null
          master_id: string | null
          metadata: Json | null
          status: string | null
          test_description: string | null
          test_id: string
          test_name: string
          test_suite: string | null
          test_type: string
          tested_endpoints: string[] | null
          tested_functions: string[] | null
        }
        Insert: {
          assertions?: number | null
          coverage_percentage?: number | null
          duration_ms?: number | null
          file_path: string
          id?: string
          last_run?: string | null
          master_id?: string | null
          metadata?: Json | null
          status?: string | null
          test_description?: string | null
          test_id: string
          test_name: string
          test_suite?: string | null
          test_type: string
          tested_endpoints?: string[] | null
          tested_functions?: string[] | null
        }
        Update: {
          assertions?: number | null
          coverage_percentage?: number | null
          duration_ms?: number | null
          file_path?: string
          id?: string
          last_run?: string | null
          master_id?: string | null
          metadata?: Json | null
          status?: string | null
          test_description?: string | null
          test_id?: string
          test_name?: string
          test_suite?: string | null
          test_type?: string
          tested_endpoints?: string[] | null
          tested_functions?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "codebase_vectors_tests_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "codebase_vectors_master"
            referencedColumns: ["id"]
          },
        ]
      }
      event_chains: {
        Row: {
          actions: Json
          chain_name: string
          created_at: string | null
          description: string | null
          enabled: boolean | null
          execution_order: number | null
          file_pattern: string | null
          id: string
          listener_id: string | null
          trigger_event_types: string[]
          updated_at: string | null
        }
        Insert: {
          actions?: Json
          chain_name: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          execution_order?: number | null
          file_pattern?: string | null
          id?: string
          listener_id?: string | null
          trigger_event_types: string[]
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          chain_name?: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          execution_order?: number | null
          file_pattern?: string | null
          id?: string
          listener_id?: string | null
          trigger_event_types?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_chains_listener_id_fkey"
            columns: ["listener_id"]
            isOneToOne: false
            referencedRelation: "event_listeners"
            referencedColumns: ["id"]
          },
        ]
      }
      event_listeners: {
        Row: {
          chain_executions: number | null
          chain_webhook_url: string | null
          configuration: Json | null
          created_at: string | null
          description: string | null
          event_count: number | null
          event_types: string[]
          file_patterns: string[] | null
          id: string
          ignore_patterns: string[] | null
          last_chain_execution: string | null
          last_event_at: string | null
          listener_id: string
          listener_type: string
          mask_name: string | null
          path: string
          recursive: boolean | null
          status: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          chain_executions?: number | null
          chain_webhook_url?: string | null
          configuration?: Json | null
          created_at?: string | null
          description?: string | null
          event_count?: number | null
          event_types: string[]
          file_patterns?: string[] | null
          id?: string
          ignore_patterns?: string[] | null
          last_chain_execution?: string | null
          last_event_at?: string | null
          listener_id: string
          listener_type: string
          mask_name?: string | null
          path: string
          recursive?: boolean | null
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          chain_executions?: number | null
          chain_webhook_url?: string | null
          configuration?: Json | null
          created_at?: string | null
          description?: string | null
          event_count?: number | null
          event_types?: string[]
          file_patterns?: string[] | null
          id?: string
          ignore_patterns?: string[] | null
          last_chain_execution?: string | null
          last_event_at?: string | null
          listener_id?: string
          listener_type?: string
          mask_name?: string | null
          path?: string
          recursive?: boolean | null
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_listeners_mask_name_fkey"
            columns: ["mask_name"]
            isOneToOne: false
            referencedRelation: "visual_masks"
            referencedColumns: ["mask_name"]
          },
        ]
      }
      file_trackings: {
        Row: {
          created_at: string | null
          id: string
          name: string
          path_pattern: string
          visual_mask_id: string | null
          webhook_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          path_pattern: string
          visual_mask_id?: string | null
          webhook_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          path_pattern?: string
          visual_mask_id?: string | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_trackings_visual_mask_id_fkey"
            columns: ["visual_mask_id"]
            isOneToOne: false
            referencedRelation: "visual_masks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_trackings_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      filesystem_analysis: {
        Row: {
          analysis_name: string
          analysis_result: Json | null
          analysis_type: string | null
          completed_at: string | null
          created_at: string | null
          directory_count: number | null
          file_count: number | null
          file_types: Json | null
          folder_path: string
          id: string
          large_files: Json | null
          recent_files: Json | null
          total_size_bytes: number | null
        }
        Insert: {
          analysis_name: string
          analysis_result?: Json | null
          analysis_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          directory_count?: number | null
          file_count?: number | null
          file_types?: Json | null
          folder_path: string
          id?: string
          large_files?: Json | null
          recent_files?: Json | null
          total_size_bytes?: number | null
        }
        Update: {
          analysis_name?: string
          analysis_result?: Json | null
          analysis_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          directory_count?: number | null
          file_count?: number | null
          file_types?: Json | null
          folder_path?: string
          id?: string
          large_files?: Json | null
          recent_files?: Json | null
          total_size_bytes?: number | null
        }
        Relationships: []
      }
      git_branches: {
        Row: {
          agent_session_id: string | null
          assigned_agent: string | null
          base_branch: string
          branch_name: string
          commit_count: number | null
          created_at: string | null
          id: number
          last_commit: string | null
          locked_at: string | null
          locked_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_session_id?: string | null
          assigned_agent?: string | null
          base_branch: string
          branch_name: string
          commit_count?: number | null
          created_at?: string | null
          id?: number
          last_commit?: string | null
          locked_at?: string | null
          locked_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_session_id?: string | null
          assigned_agent?: string | null
          base_branch?: string
          branch_name?: string
          commit_count?: number | null
          created_at?: string | null
          id?: number
          last_commit?: string | null
          locked_at?: string | null
          locked_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      git_commits: {
        Row: {
          author: string
          branch_name: string
          commit_hash: string
          created_at: string | null
          files_changed: Json | null
          id: number
          lines_added: number | null
          lines_removed: number | null
          message: string
          status: string | null
          test_results: Json | null
          timestamp: string
          updated_at: string | null
        }
        Insert: {
          author: string
          branch_name: string
          commit_hash: string
          created_at?: string | null
          files_changed?: Json | null
          id?: number
          lines_added?: number | null
          lines_removed?: number | null
          message: string
          status?: string | null
          test_results?: Json | null
          timestamp: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          branch_name?: string
          commit_hash?: string
          created_at?: string | null
          files_changed?: Json | null
          id?: number
          lines_added?: number | null
          lines_removed?: number | null
          message?: string
          status?: string | null
          test_results?: Json | null
          timestamp?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      git_file_nodes: {
        Row: {
          centrality_score: number | null
          class_count: number | null
          created_at: string | null
          created_date: string | null
          dependency_weight: number | null
          depth_from_root: number | null
          directory_path: string | null
          exports_count: number | null
          file_extension: string | null
          file_id: string
          file_name: string
          file_path: string
          file_size_bytes: number | null
          file_type: string
          function_count: number | null
          id: string
          imports_count: number | null
          incoming_dependencies: number | null
          language: string | null
          last_analyzed: string | null
          last_commit_hash: string | null
          last_modified: string | null
          lines_of_code: number | null
          modification_count: number | null
          outgoing_dependencies: number | null
          parent_directory: string | null
          repo_id: string
        }
        Insert: {
          centrality_score?: number | null
          class_count?: number | null
          created_at?: string | null
          created_date?: string | null
          dependency_weight?: number | null
          depth_from_root?: number | null
          directory_path?: string | null
          exports_count?: number | null
          file_extension?: string | null
          file_id: string
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          file_type: string
          function_count?: number | null
          id?: string
          imports_count?: number | null
          incoming_dependencies?: number | null
          language?: string | null
          last_analyzed?: string | null
          last_commit_hash?: string | null
          last_modified?: string | null
          lines_of_code?: number | null
          modification_count?: number | null
          outgoing_dependencies?: number | null
          parent_directory?: string | null
          repo_id: string
        }
        Update: {
          centrality_score?: number | null
          class_count?: number | null
          created_at?: string | null
          created_date?: string | null
          dependency_weight?: number | null
          depth_from_root?: number | null
          directory_path?: string | null
          exports_count?: number | null
          file_extension?: string | null
          file_id?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string
          function_count?: number | null
          id?: string
          imports_count?: number | null
          incoming_dependencies?: number | null
          language?: string | null
          last_analyzed?: string | null
          last_commit_hash?: string | null
          last_modified?: string | null
          lines_of_code?: number | null
          modification_count?: number | null
          outgoing_dependencies?: number | null
          parent_directory?: string | null
          repo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "git_file_nodes_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "git_repositories"
            referencedColumns: ["repo_id"]
          },
        ]
      }
      git_repositories: {
        Row: {
          branch: string | null
          commit_count: number | null
          complexity_score: number | null
          contributors: Json | null
          created_at: string | null
          dependency_depth: number | null
          git_url: string | null
          id: string
          languages: Json | null
          last_commit_date: string | null
          last_commit_hash: string | null
          last_scanned: string | null
          maintainability_index: number | null
          primary_language: string | null
          repo_id: string
          repo_name: string
          repo_path: string
          total_directories: number | null
          total_files: number | null
          total_lines_of_code: number | null
        }
        Insert: {
          branch?: string | null
          commit_count?: number | null
          complexity_score?: number | null
          contributors?: Json | null
          created_at?: string | null
          dependency_depth?: number | null
          git_url?: string | null
          id?: string
          languages?: Json | null
          last_commit_date?: string | null
          last_commit_hash?: string | null
          last_scanned?: string | null
          maintainability_index?: number | null
          primary_language?: string | null
          repo_id: string
          repo_name: string
          repo_path: string
          total_directories?: number | null
          total_files?: number | null
          total_lines_of_code?: number | null
        }
        Update: {
          branch?: string | null
          commit_count?: number | null
          complexity_score?: number | null
          contributors?: Json | null
          created_at?: string | null
          dependency_depth?: number | null
          git_url?: string | null
          id?: string
          languages?: Json | null
          last_commit_date?: string | null
          last_commit_hash?: string | null
          last_scanned?: string | null
          maintainability_index?: number | null
          primary_language?: string | null
          repo_id?: string
          repo_name?: string
          repo_path?: string
          total_directories?: number | null
          total_files?: number | null
          total_lines_of_code?: number | null
        }
        Relationships: []
      }
      live_desktop_configs: {
        Row: {
          category: string | null
          configuration: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          configuration?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          configuration?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mask_execution_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_duration_ms: number | null
          execution_id: string
          execution_mode: string | null
          execution_result: Json | null
          execution_time: string | null
          id: string
          listener_id: string | null
          mask_name: string | null
          parameters: Json | null
          response_time_ms: number | null
          success: boolean
          trigger_event: Json | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_duration_ms?: number | null
          execution_id: string
          execution_mode?: string | null
          execution_result?: Json | null
          execution_time?: string | null
          id?: string
          listener_id?: string | null
          mask_name?: string | null
          parameters?: Json | null
          response_time_ms?: number | null
          success: boolean
          trigger_event?: Json | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_duration_ms?: number | null
          execution_id?: string
          execution_mode?: string | null
          execution_result?: Json | null
          execution_time?: string | null
          id?: string
          listener_id?: string | null
          mask_name?: string | null
          parameters?: Json | null
          response_time_ms?: number | null
          success?: boolean
          trigger_event?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mask_execution_logs_listener_id_fkey"
            columns: ["listener_id"]
            isOneToOne: false
            referencedRelation: "event_listeners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mask_execution_logs_mask_name_fkey"
            columns: ["mask_name"]
            isOneToOne: false
            referencedRelation: "visual_masks"
            referencedColumns: ["mask_name"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      n8n_environments: {
        Row: {
          api_key_encrypted: string | null
          backup_frequency_hours: number | null
          config: Json | null
          created_at: string | null
          environment: string
          execution_timeout_minutes: number | null
          health_status: string | null
          id: string
          last_health_check: string | null
          max_concurrent_executions: number | null
          n8n_url: string
          updated_at: string | null
          webhook_base_url: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          backup_frequency_hours?: number | null
          config?: Json | null
          created_at?: string | null
          environment: string
          execution_timeout_minutes?: number | null
          health_status?: string | null
          id?: string
          last_health_check?: string | null
          max_concurrent_executions?: number | null
          n8n_url: string
          updated_at?: string | null
          webhook_base_url?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          backup_frequency_hours?: number | null
          config?: Json | null
          created_at?: string | null
          environment?: string
          execution_timeout_minutes?: number | null
          health_status?: string | null
          id?: string
          last_health_check?: string | null
          max_concurrent_executions?: number | null
          n8n_url?: string
          updated_at?: string | null
          webhook_base_url?: string | null
        }
        Relationships: []
      }
      n8n_executions: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          environment: string
          error_message: string | null
          execution_id: string
          finished_at: string | null
          id: string
          input_data: Json | null
          mode: string | null
          node_execution_data: Json | null
          output_data: Json | null
          retry_count: number | null
          started_at: string
          status: string
          trigger_data: Json | null
          webhook_url: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          environment: string
          error_message?: string | null
          execution_id: string
          finished_at?: string | null
          id?: string
          input_data?: Json | null
          mode?: string | null
          node_execution_data?: Json | null
          output_data?: Json | null
          retry_count?: number | null
          started_at: string
          status: string
          trigger_data?: Json | null
          webhook_url?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          environment?: string
          error_message?: string | null
          execution_id?: string
          finished_at?: string | null
          id?: string
          input_data?: Json | null
          mode?: string | null
          node_execution_data?: Json | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string
          status?: string
          trigger_data?: Json | null
          webhook_url?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_executions_workflow_id_environment_fkey"
            columns: ["workflow_id", "environment"]
            isOneToOne: false
            referencedRelation: "n8n_workflows"
            referencedColumns: ["workflow_id", "environment"]
          },
        ]
      }
      n8n_webhooks: {
        Row: {
          authentication_type: string | null
          created_at: string | null
          environment: string
          id: string
          is_active: boolean | null
          last_triggered: string | null
          method: string | null
          node_id: string
          path: string
          trigger_count: number | null
          webhook_id: string
          webhook_url: string
          workflow_id: string
        }
        Insert: {
          authentication_type?: string | null
          created_at?: string | null
          environment: string
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          method?: string | null
          node_id: string
          path: string
          trigger_count?: number | null
          webhook_id: string
          webhook_url: string
          workflow_id: string
        }
        Update: {
          authentication_type?: string | null
          created_at?: string | null
          environment?: string
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          method?: string | null
          node_id?: string
          path?: string
          trigger_count?: number | null
          webhook_id?: string
          webhook_url?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_webhooks_workflow_id_environment_fkey"
            columns: ["workflow_id", "environment"]
            isOneToOne: false
            referencedRelation: "n8n_workflows"
            referencedColumns: ["workflow_id", "environment"]
          },
        ]
      }
      n8n_workflow_nodes: {
        Row: {
          created_at: string | null
          credentials: Json | null
          dependencies: string[] | null
          environment: string
          id: string
          node_id: string
          node_name: string
          node_type: string
          parameters: Json | null
          position_x: number | null
          position_y: number | null
          webhooks: Json | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          credentials?: Json | null
          dependencies?: string[] | null
          environment: string
          id?: string
          node_id: string
          node_name: string
          node_type: string
          parameters?: Json | null
          position_x?: number | null
          position_y?: number | null
          webhooks?: Json | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          credentials?: Json | null
          dependencies?: string[] | null
          environment?: string
          id?: string
          node_id?: string
          node_name?: string
          node_type?: string
          parameters?: Json | null
          position_x?: number | null
          position_y?: number | null
          webhooks?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_workflow_nodes_workflow_id_environment_fkey"
            columns: ["workflow_id", "environment"]
            isOneToOne: false
            referencedRelation: "n8n_workflows"
            referencedColumns: ["workflow_id", "environment"]
          },
        ]
      }
      n8n_workflows: {
        Row: {
          connections_count: number | null
          created_at: string | null
          created_by: string | null
          environment: string
          id: string
          last_backup_at: string | null
          metadata: Json | null
          name: string
          nodes_count: number | null
          schedule_config: Json | null
          status: string | null
          updated_at: string | null
          version: string | null
          webhook_endpoints: Json | null
          workflow_id: string
          workflow_json: Json
        }
        Insert: {
          connections_count?: number | null
          created_at?: string | null
          created_by?: string | null
          environment: string
          id?: string
          last_backup_at?: string | null
          metadata?: Json | null
          name: string
          nodes_count?: number | null
          schedule_config?: Json | null
          status?: string | null
          updated_at?: string | null
          version?: string | null
          webhook_endpoints?: Json | null
          workflow_id: string
          workflow_json: Json
        }
        Update: {
          connections_count?: number | null
          created_at?: string | null
          created_by?: string | null
          environment?: string
          id?: string
          last_backup_at?: string | null
          metadata?: Json | null
          name?: string
          nodes_count?: number | null
          schedule_config?: Json | null
          status?: string | null
          updated_at?: string | null
          version?: string | null
          webhook_endpoints?: Json | null
          workflow_id?: string
          workflow_json?: Json
        }
        Relationships: []
      }
      service_logs: {
        Row: {
          created_at: string | null
          id: string
          level: string
          log_id: string
          message: string
          metadata: Json | null
          source: string
          timestamp: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: string
          log_id: string
          message: string
          metadata?: Json | null
          source: string
          timestamp?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          log_id?: string
          message?: string
          metadata?: Json | null
          source?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      trae_activity_log: {
        Row: {
          activity_name: string
          activity_type: string
          actor_id: string | null
          actor_name: string | null
          actor_type: string
          completed_at: string | null
          created_at: string
          description: string | null
          duration_ms: number | null
          error_details: Json | null
          id: string
          metadata: Json | null
          project_id: string | null
          session_id: string | null
          status: string | null
          tags: string[] | null
        }
        Insert: {
          activity_name: string
          activity_type: string
          actor_id?: string | null
          actor_name?: string | null
          actor_type: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          session_id?: string | null
          status?: string | null
          tags?: string[] | null
        }
        Update: {
          activity_name?: string
          activity_type?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          session_id?: string | null
          status?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vector_relationships: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          relationship_type: string
          source_vector_id: string
          target_vector_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relationship_type: string
          source_vector_id: string
          target_vector_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relationship_type?: string
          source_vector_id?: string
          target_vector_id?: string
        }
        Relationships: []
      }
      visual_masks: {
        Row: {
          category: string | null
          click_points: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          elements_count: number | null
          id: string
          is_active: boolean | null
          mask_name: string
          metadata: Json | null
          screen_resolution: Json | null
          screenshot_file: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          click_points?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          elements_count?: number | null
          id?: string
          is_active?: boolean | null
          mask_name: string
          metadata?: Json | null
          screen_resolution?: Json | null
          screenshot_file?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          click_points?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          elements_count?: number | null
          id?: string
          is_active?: boolean | null
          mask_name?: string
          metadata?: Json | null
          screen_resolution?: Json | null
          screenshot_file?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          created_at: string | null
          id: string
          name: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          url?: string
        }
        Relationships: []
      }
      workflow_templates: {
        Row: {
          category: string | null
          configuration: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          tags: string[] | null
          template_name: string
          template_type: string
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          category?: string | null
          configuration: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          template_name: string
          template_type: string
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          category?: string | null
          configuration?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          template_name?: string
          template_type?: string
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      code_hubs: {
        Row: {
          file_path: string | null
          incoming_connections: number | null
          outgoing_connections: number | null
          total_connections: number | null
          vector_id: string | null
          vector_type: string | null
        }
        Relationships: []
      }
      critical_files: {
        Row: {
          centrality_score: number | null
          change_impact_score: number | null
          criticality_level: string | null
          file_path: string | null
          incoming_dependencies: number | null
          outgoing_dependencies: number | null
          vector_id: string | null
          vector_type: string | null
        }
        Relationships: []
      }
      git_service_stats: {
        Row: {
          active_branches: number | null
          agents_assigned: number | null
          average_commit_size: number | null
          locked_branches: number | null
          test_success_rate: number | null
          total_branches: number | null
          total_commits: number | null
        }
        Relationships: []
      }
      service_logs_stats: {
        Row: {
          count: number | null
          earliest_log: string | null
          latest_log: string | null
          level: string | null
          source: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      find_related_vectors: {
        Args: {
          source_vector_id: string
          relationship_types?: string[]
          max_depth?: number
        }
        Returns: {
          vector_id: string
          relationship_type: string
          depth: number
          path: string[]
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_search_count: {
        Args: { vector_ids: string[] }
        Returns: undefined
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      search_all_vectors: {
        Args:
          | {
              query_embedding: string
              match_threshold?: number
              match_count?: number
              filter_types?: string[]
            }
          | {
              query_embedding: string
              match_threshold?: number
              match_count?: number
              filter_types?: string[]
              filter_project_id?: string
            }
        Returns: {
          vector_id: string
          vector_type: string
          title: string
          content: string
          file_path: string
          similarity: number
          metadata: Json
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const

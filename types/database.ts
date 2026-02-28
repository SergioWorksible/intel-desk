export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'analyst' | 'reader'
export type SourceType = 'media' | 'official' | 'wire' | 'think-tank' | 'sensor'
export type HypothesisStatus = 'active' | 'confirmed' | 'falsified' | 'archived'
export type AlertType = 'threshold' | 'volume' | 'correlation' | 'event'
export type MarketRegime = 'risk-on' | 'risk-off' | 'neutral'
export type NodeType = 'event' | 'mechanism' | 'variable' | 'actor' | 'outcome'
export type EdgeType = 'causes' | 'correlates' | 'triggers' | 'constrains'
export type PlaybookActor = 'company' | 'investor' | 'individual' | 'government'
export type EntityType = 'person' | 'organization' | 'location' | 'event' | 'country'
export type RelationshipType = 'mentioned_together' | 'cooperation' | 'conflict' | 'trade' | 'diplomacy' | 'military' | 'economic' | 'influence' | 'membership' | 'leadership' | 'location' | 'event_participant'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          updated_at?: string
        }
      }
      sources: {
        Row: {
          id: string
          name: string
          type: SourceType
          rss_url: string | null
          website_url: string | null
          country: string | null
          language: string
          reputation_base: number
          enabled: boolean
          tags: string[]
          last_fetched_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: SourceType
          rss_url?: string | null
          website_url?: string | null
          country?: string | null
          language?: string
          reputation_base?: number
          enabled?: boolean
          tags?: string[]
          last_fetched_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: SourceType
          rss_url?: string | null
          website_url?: string | null
          country?: string | null
          language?: string
          reputation_base?: number
          enabled?: boolean
          tags?: string[]
          last_fetched_at?: string | null
          updated_at?: string
        }
      }
      articles: {
        Row: {
          id: string
          source_id: string
          title: string
          url: string
          canonical_url: string
          domain: string
          published_at: string | null
          fetched_at: string
          snippet: string | null
          full_content: string | null
          content_hash: string | null
          language: string
          countries: string[]
          topics: string[]
          entities: Json
          computed_score: number | null
          cluster_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source_id: string
          title: string
          url: string
          canonical_url: string
          domain: string
          published_at?: string | null
          fetched_at?: string
          snippet?: string | null
          full_content?: string | null
          content_hash?: string | null
          language?: string
          countries?: string[]
          topics?: string[]
          entities?: Json
          computed_score?: number | null
          cluster_id?: string | null
          created_at?: string
        }
        Update: {
          source_id?: string
          title?: string
          url?: string
          canonical_url?: string
          domain?: string
          published_at?: string | null
          fetched_at?: string
          snippet?: string | null
          full_content?: string | null
          content_hash?: string | null
          language?: string
          countries?: string[]
          topics?: string[]
          entities?: Json
          computed_score?: number | null
          cluster_id?: string | null
        }
      }
      clusters: {
        Row: {
          id: string
          canonical_title: string
          summary: string | null
          window_start: string
          window_end: string
          countries: string[]
          topics: string[]
          entities: Json
          severity: number
          confidence: number
          article_count: number
          source_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canonical_title: string
          summary?: string | null
          window_start: string
          window_end: string
          countries?: string[]
          topics?: string[]
          entities?: Json
          severity?: number
          confidence?: number
          article_count?: number
          source_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          canonical_title?: string
          summary?: string | null
          window_start?: string
          window_end?: string
          countries?: string[]
          topics?: string[]
          entities?: Json
          severity?: number
          confidence?: number
          article_count?: number
          source_count?: number
          updated_at?: string
        }
      }
      countries: {
        Row: {
          id: string
          code: string
          name: string
          region: string
          subregion: string | null
          capital: string | null
          population: number | null
          gdp_usd: number | null
          government_type: string | null
          leader_name: string | null
          leader_title: string | null
          overview: string | null
          drivers: Json
          watchlist: boolean
          geo_json: Json | null
          stability_index: number | null
          economic_index: number | null
          political_index: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          region: string
          subregion?: string | null
          capital?: string | null
          population?: number | null
          gdp_usd?: number | null
          government_type?: string | null
          leader_name?: string | null
          leader_title?: string | null
          overview?: string | null
          drivers?: Json
          watchlist?: boolean
          geo_json?: Json | null
          stability_index?: number | null
          economic_index?: number | null
          political_index?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          code?: string
          name?: string
          region?: string
          subregion?: string | null
          capital?: string | null
          population?: number | null
          gdp_usd?: number | null
          government_type?: string | null
          leader_name?: string | null
          leader_title?: string | null
          overview?: string | null
          drivers?: Json
          watchlist?: boolean
          geo_json?: Json | null
          stability_index?: number | null
          economic_index?: number | null
          political_index?: number | null
          updated_at?: string
        }
      }
      country_intel_cache: {
        Row: {
          id: string
          country_code: string
          intel_data: Json
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          country_code: string
          intel_data?: Json
          updated_at?: string
          created_at?: string
        }
        Update: {
          intel_data?: Json
          updated_at?: string
        }
      }
      hypotheses: {
        Row: {
          id: string
          user_id: string
          title: string
          statement: string
          prob_initial: number
          prob_current: number
          assumptions: Json
          confirm_signals: Json
          falsify_signals: Json
          red_team_analysis: string | null
          premortem_analysis: string | null
          next_review_at: string | null
          status: HypothesisStatus
          linked_cluster_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          statement: string
          prob_initial: number
          prob_current?: number
          assumptions?: Json
          confirm_signals?: Json
          falsify_signals?: Json
          red_team_analysis?: string | null
          premortem_analysis?: string | null
          next_review_at?: string | null
          status?: HypothesisStatus
          linked_cluster_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          title?: string
          statement?: string
          prob_initial?: number
          prob_current?: number
          assumptions?: Json
          confirm_signals?: Json
          falsify_signals?: Json
          red_team_analysis?: string | null
          premortem_analysis?: string | null
          next_review_at?: string | null
          status?: HypothesisStatus
          linked_cluster_ids?: string[]
          updated_at?: string
        }
      }
      hypothesis_revisions: {
        Row: {
          id: string
          hypothesis_id: string
          user_id: string
          prob_before: number
          prob_after: number
          rationale: string
          evidence_ids: string[]
          created_at: string
        }
        Insert: {
          id?: string
          hypothesis_id: string
          user_id: string
          prob_before: number
          prob_after: number
          rationale: string
          evidence_ids?: string[]
          created_at?: string
        }
        Update: never
      }
      playbooks: {
        Row: {
          id: string
          user_id: string
          title: string
          actor_type: PlaybookActor
          objective: string
          options: Json
          tradeoffs: string | null
          triggers: Json
          type_i_cost: string | null
          type_ii_cost: string | null
          checklist: Json
          response_72h: string | null
          linked_hypothesis_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          actor_type: PlaybookActor
          objective: string
          options?: Json
          tradeoffs?: string | null
          triggers?: Json
          type_i_cost?: string | null
          type_ii_cost?: string | null
          checklist?: Json
          response_72h?: string | null
          linked_hypothesis_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          title?: string
          actor_type?: PlaybookActor
          objective?: string
          options?: Json
          tradeoffs?: string | null
          triggers?: Json
          type_i_cost?: string | null
          type_ii_cost?: string | null
          checklist?: Json
          response_72h?: string | null
          linked_hypothesis_ids?: string[]
          updated_at?: string
        }
      }
      causal_graphs: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          nodes: Json
          edges: Json
          linked_cluster_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          nodes?: Json
          edges?: Json
          linked_cluster_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          title?: string
          description?: string | null
          nodes?: Json
          edges?: Json
          linked_cluster_ids?: string[]
          updated_at?: string
        }
      }
      briefings: {
        Row: {
          id: string
          date: string
          items: Json
          generated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          items?: Json
          generated_at?: string
          created_at?: string
        }
        Update: {
          date?: string
          items?: Json
          generated_at?: string
        }
      }
      briefing_interactions: {
        Row: {
          id: string
          briefing_id: string
          item_index: number
          user_id: string
          action: 'pin' | 'hide' | 'read'
          created_at: string
        }
        Insert: {
          id?: string
          briefing_id: string
          item_index: number
          user_id: string
          action: 'pin' | 'hide' | 'read'
          created_at?: string
        }
        Update: never
      }
      market_symbols: {
        Row: {
          id: string
          symbol: string
          name: string
          type: 'stock' | 'index' | 'forex' | 'commodity' | 'crypto'
          currency: string
          exchange: string | null
          sector: string | null
          country: string | null
          countries: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          symbol: string
          name: string
          type: 'stock' | 'index' | 'forex' | 'commodity' | 'crypto'
          currency?: string
          exchange?: string | null
          sector?: string | null
          country?: string | null
          countries?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          symbol?: string
          name?: string
          type?: 'stock' | 'index' | 'forex' | 'commodity' | 'crypto'
          currency?: string
          exchange?: string | null
          sector?: string | null
          country?: string | null
          countries?: string[] | null
          is_active?: boolean
          updated_at?: string
        }
      }
      market_quotes: {
        Row: {
          id: string
          symbol_id: string
          price: number
          change: number
          change_percent: number
          volume: number | null
          high: number | null
          low: number | null
          open: number | null
          previous_close: number | null
          timestamp: string
          provider: string
          created_at: string
        }
        Insert: {
          id?: string
          symbol_id: string
          price: number
          change?: number
          change_percent?: number
          volume?: number | null
          high?: number | null
          low?: number | null
          open?: number | null
          previous_close?: number | null
          timestamp?: string
          provider: string
          created_at?: string
        }
        Update: never
      }
      market_ohlcv: {
        Row: {
          id: string
          symbol_id: string
          date: string
          open: number
          high: number
          low: number
          close: number
          volume: number
          provider: string
          created_at: string
        }
        Insert: {
          id?: string
          symbol_id: string
          date: string
          open: number
          high: number
          low: number
          close: number
          volume?: number
          provider: string
          created_at?: string
        }
        Update: never
      }
      market_event_links: {
        Row: {
          id: string
          symbol_id: string
          cluster_id: string
          rationale: string | null
          impact_assessment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          symbol_id: string
          cluster_id: string
          rationale?: string | null
          impact_assessment?: string | null
          created_at?: string
        }
        Update: {
          rationale?: string | null
          impact_assessment?: string | null
        }
      }
      watchlists: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'country' | 'topic' | 'entity' | 'asset'
          items: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'country' | 'topic' | 'entity' | 'asset'
          items?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: 'country' | 'topic' | 'entity' | 'asset'
          items?: Json
          updated_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: AlertType
          config: Json
          enabled: boolean
          last_triggered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: AlertType
          config: Json
          enabled?: boolean
          last_triggered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: AlertType
          config?: Json
          enabled?: boolean
          last_triggered_at?: string | null
          updated_at?: string
        }
      }
      alert_events: {
        Row: {
          id: string
          alert_id: string
          user_id: string
          message: string
          data: Json
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          alert_id: string
          user_id: string
          message: string
          data?: Json
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: 'create' | 'update' | 'delete'
          entity_type: string
          entity_id: string
          changes: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: 'create' | 'update' | 'delete'
          entity_type: string
          entity_id: string
          changes?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: never
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
      }
      research_queries: {
        Row: {
          id: string
          user_id: string
          query: string
          filters: Json
          response: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query: string
          filters?: Json
          response?: Json
          created_at?: string
        }
        Update: never
      }
      entities: {
        Row: {
          id: string
          name: string
          type: EntityType
          canonical_name: string | null
          aliases: string[]
          metadata: Json
          first_seen_at: string
          last_seen_at: string
          article_count: number
          cluster_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: EntityType
          canonical_name?: string | null
          aliases?: string[]
          metadata?: Json
          first_seen_at?: string
          last_seen_at?: string
          article_count?: number
          cluster_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: EntityType
          canonical_name?: string | null
          aliases?: string[]
          metadata?: Json
          first_seen_at?: string
          last_seen_at?: string
          article_count?: number
          cluster_count?: number
          updated_at?: string
        }
      }
      entity_relationships: {
        Row: {
          id: string
          source_entity_id: string
          target_entity_id: string
          relationship_type: RelationshipType
          strength: number
          context: string | null
          first_seen_at: string
          last_seen_at: string
          article_count: number
          cluster_ids: string[]
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_entity_id: string
          target_entity_id: string
          relationship_type: RelationshipType
          strength?: number
          context?: string | null
          first_seen_at?: string
          last_seen_at?: string
          article_count?: number
          cluster_ids?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          source_entity_id?: string
          target_entity_id?: string
          relationship_type?: RelationshipType
          strength?: number
          context?: string | null
          first_seen_at?: string
          last_seen_at?: string
          article_count?: number
          cluster_ids?: string[]
          metadata?: Json
          updated_at?: string
        }
      }
      entity_mentions: {
        Row: {
          id: string
          entity_id: string
          article_id: string
          cluster_id: string | null
          context: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_id: string
          article_id: string
          cluster_id?: string | null
          context?: string | null
          created_at?: string
        }
        Update: {
          entity_id?: string
          article_id?: string
          cluster_id?: string | null
          context?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_articles: {
        Args: {
          query_text: string
          limit_count?: number
        }
        Returns: {
          id: string
          title: string
          snippet: string
          url: string
          published_at: string
          source_name: string
          rank: number
        }[]
      }
    }
    Enums: {
      user_role: UserRole
      source_type: SourceType
      hypothesis_status: HypothesisStatus
      alert_type: AlertType
      node_type: NodeType
      edge_type: EdgeType
      playbook_actor: PlaybookActor
      entity_type: EntityType
      relationship_type: RelationshipType
    }
  }
}


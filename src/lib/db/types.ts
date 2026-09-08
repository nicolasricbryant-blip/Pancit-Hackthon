export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string
          game_id: string | null
          id: string
          pinned: boolean
          title: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          pinned?: boolean
          title: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          pinned?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket_matches: {
        Row: {
          created_at: string
          id: string
          next_match_id: string | null
          next_slot: number | null
          round: number
          score_a: number | null
          score_b: number | null
          slot: number
          status: string
          team_a: string | null
          team_b: string | null
          tournament_id: string
          updated_at: string
          winner: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          next_match_id?: string | null
          next_slot?: number | null
          round: number
          score_a?: number | null
          score_b?: number | null
          slot: number
          status?: string
          team_a?: string | null
          team_b?: string | null
          tournament_id: string
          updated_at?: string
          winner?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          next_match_id?: string | null
          next_slot?: number | null
          round?: number
          score_a?: number | null
          score_b?: number | null
          slot?: number
          status?: string
          team_a?: string | null
          team_b?: string | null
          tournament_id?: string
          updated_at?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bracket_matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "bracket_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_team_a_fkey"
            columns: ["team_a"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_team_b_fkey"
            columns: ["team_b"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_winner_fkey"
            columns: ["winner"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      community_standing: {
        Row: {
          events_attended: number
          events_hosted: number
          id: string
          points: number
          profile_id: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          events_attended?: number
          events_hosted?: number
          id?: string
          points?: number
          profile_id?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          events_attended?: number
          events_hosted?: number
          id?: string
          points?: number
          profile_id?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_standing_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_standing_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          checked_in_at: string | null
          created_at: string
          event_id: string
          id: string
          profile_id: string
          status: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          profile_id: string
          status?: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          profile_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          checkin_code: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          game_id: string | null
          host_org: string | null
          host_profile_id: string | null
          id: string
          is_physical: boolean
          kind: string
          region: string | null
          school_id: string | null
          starts_at: string | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          capacity?: number | null
          checkin_code?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          game_id?: string | null
          host_org?: string | null
          host_profile_id?: string | null
          id?: string
          is_physical?: boolean
          kind: string
          region?: string | null
          school_id?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          capacity?: number | null
          checkin_code?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          game_id?: string | null
          host_org?: string | null
          host_profile_id?: string | null
          id?: string
          is_physical?: boolean
          kind?: string
          region?: string | null
          school_id?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      free_agent_posts: {
        Row: {
          blurb: string | null
          created_at: string
          game_id: string
          id: string
          looking_for: string
          profile_id: string
          rank_label: string | null
          roles_wanted: string[]
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          blurb?: string | null
          created_at?: string
          game_id: string
          id?: string
          looking_for: string
          profile_id: string
          rank_label?: string | null
          roles_wanted?: string[]
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          blurb?: string | null
          created_at?: string
          game_id?: string
          id?: string
          looking_for?: string
          profile_id?: string
          rank_label?: string | null
          roles_wanted?: string[]
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "free_agent_posts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "free_agent_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "free_agent_posts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_profiles: {
        Row: {
          claimed_rank: Json
          created_at: string
          game_id: string
          id: string
          main_roles: string[]
          profile_id: string
          rank_label: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          claimed_rank?: Json
          created_at?: string
          game_id: string
          id?: string
          main_roles?: string[]
          profile_id: string
          rank_label?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          claimed_rank?: Json
          created_at?: string
          game_id?: string
          id?: string
          main_roles?: string[]
          profile_id?: string
          rank_label?: string | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_profiles_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          form_fields: Json
          hue_token: string
          id: string
          name: string
          rank_tiers: Json
          short_name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          form_fields?: Json
          hue_token: string
          id: string
          name: string
          rank_tiers?: Json
          short_name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          form_fields?: Json
          hue_token?: string
          id?: string
          name?: string
          rank_tiers?: Json
          short_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      lobbies: {
        Row: {
          auto_fill: boolean
          created_at: string
          expires_at: string
          game_id: string
          host_id: string
          id: string
          mic_required: boolean
          mode: string
          needed_roles: string[]
          rank_max: string | null
          rank_min: string | null
          slots_total: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          auto_fill?: boolean
          created_at?: string
          expires_at?: string
          game_id: string
          host_id: string
          id?: string
          mic_required?: boolean
          mode?: string
          needed_roles?: string[]
          rank_max?: string | null
          rank_min?: string | null
          slots_total?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          auto_fill?: boolean
          created_at?: string
          expires_at?: string
          game_id?: string
          host_id?: string
          id?: string
          mic_required?: boolean
          mode?: string
          needed_roles?: string[]
          rank_max?: string | null
          rank_min?: string | null
          slots_total?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobbies_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobbies_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lobby_autojoin_prefs: {
        Row: {
          enabled: boolean
          game_id: string
          mic_ok: boolean
          modes: string[]
          profile_id: string
          rank_max: string | null
          rank_min: string | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          game_id: string
          mic_ok?: boolean
          modes?: string[]
          profile_id: string
          rank_max?: string | null
          rank_min?: string | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          game_id?: string
          mic_ok?: boolean
          modes?: string[]
          profile_id?: string
          rank_max?: string | null
          rank_min?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobby_autojoin_prefs_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_autojoin_prefs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lobby_members: {
        Row: {
          created_at: string
          id: string
          joined_via: string
          lobby_id: string
          profile_id: string
          ready_by: string | null
          role: string | null
          state: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_via?: string
          lobby_id: string
          profile_id: string
          ready_by?: string | null
          role?: string | null
          state?: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_via?: string
          lobby_id?: string
          profile_id?: string
          ready_by?: string | null
          role?: string | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobby_members_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_requests: {
        Row: {
          created_at: string
          game_id: string | null
          id: string
          kind: string
          mentee_id: string
          mentor_id: string | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          id?: string
          kind?: string
          mentee_id: string
          mentor_id?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string | null
          id?: string
          kind?: string
          mentee_id?: string
          mentor_id?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_requests_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          id: string
          joined_at: string
          org_id: string
          profile_id: string
          role: string
          title: string | null
        }
        Insert: {
          id?: string
          joined_at?: string
          org_id: string
          profile_id: string
          role?: string
          title?: string | null
        }
        Update: {
          id?: string
          joined_at?: string
          org_id?: string
          profile_id?: string
          role?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          kind: string
          links: Json
          logo_url: string | null
          name: string
          owner_id: string | null
          region: string | null
          school_id: string | null
          short_name: string | null
          slug: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          kind?: string
          links?: Json
          logo_url?: string | null
          name: string
          owner_id?: string | null
          region?: string | null
          school_id?: string | null
          short_name?: string | null
          slug: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          kind?: string
          links?: Json
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          region?: string | null
          school_id?: string | null
          short_name?: string | null
          slug?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orgs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orgs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          exam_mode: boolean
          exam_mode_until: string | null
          handle: string | null
          id: string
          onboarded: boolean
          region: string | null
          roles: string[]
          school_id: string | null
          school_other: string | null
          school_verified: boolean
          trusted_submitter: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          exam_mode?: boolean
          exam_mode_until?: string | null
          handle?: string | null
          id: string
          onboarded?: boolean
          region?: string | null
          roles?: string[]
          school_id?: string | null
          school_other?: string | null
          school_verified?: boolean
          trusted_submitter?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          exam_mode?: boolean
          exam_mode_until?: string | null
          handle?: string | null
          id?: string
          onboarded?: boolean
          region?: string | null
          roles?: string[]
          school_id?: string | null
          school_other?: string | null
          school_verified?: boolean
          trusted_submitter?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_submissions: {
        Row: {
          claimed_rank: Json
          created_at: string
          game_id: string
          game_profile_id: string
          id: string
          profile_id: string
          review_reason: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          screenshot_path: string | null
          status: string
        }
        Insert: {
          claimed_rank?: Json
          created_at?: string
          game_id: string
          game_profile_id: string
          id?: string
          profile_id: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          screenshot_path?: string | null
          status?: string
        }
        Update: {
          claimed_rank?: Json
          created_at?: string
          game_id?: string
          game_profile_id?: string
          id?: string
          profile_id?: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          screenshot_path?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_submissions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rank_submissions_game_profile_id_fkey"
            columns: ["game_profile_id"]
            isOneToOne: false
            referencedRelation: "game_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rank_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rank_submissions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          game_id: string
          id: string
          losses: number
          matches_played: number
          profile_id: string | null
          rating: number
          seeded_from_rank: string | null
          team_id: string | null
          updated_at: string
          wins: number
        }
        Insert: {
          game_id: string
          id?: string
          losses?: number
          matches_played?: number
          profile_id?: string | null
          rating?: number
          seeded_from_rank?: string | null
          team_id?: string | null
          updated_at?: string
          wins?: number
        }
        Update: {
          game_id?: string
          id?: string
          losses?: number
          matches_played?: number
          profile_id?: string | null
          rating?: number
          seeded_from_rank?: string | null
          team_id?: string | null
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      reliability_scores: {
        Row: {
          early_quits: number
          id: string
          no_shows: number
          profile_id: string | null
          score: number
          scrims_completed: number
          team_id: string | null
          updated_at: string
        }
        Insert: {
          early_quits?: number
          id?: string
          no_shows?: number
          profile_id?: string | null
          score?: number
          scrims_completed?: number
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          early_quits?: number
          id?: string
          no_shows?: number
          profile_id?: string | null
          score?: number
          scrims_completed?: number
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reliability_scores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          email_domains: string[]
          id: string
          name: string
          region: string | null
          short_name: string | null
        }
        Insert: {
          created_at?: string
          email_domains?: string[]
          id?: string
          name: string
          region?: string | null
          short_name?: string | null
        }
        Update: {
          created_at?: string
          email_domains?: string[]
          id?: string
          name?: string
          region?: string | null
          short_name?: string | null
        }
        Relationships: []
      }
      scrim_listings: {
        Row: {
          created_at: string
          ends_at: string | null
          format: string
          game_id: string
          id: string
          notes: string | null
          posted_by: string | null
          rank_band_label: string | null
          rank_max: string | null
          rank_min: string | null
          ruleset: Json
          starts_at: string | null
          status: string
          team_id: string
          updated_at: string
          window_label: string | null
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          format?: string
          game_id: string
          id?: string
          notes?: string | null
          posted_by?: string | null
          rank_band_label?: string | null
          rank_max?: string | null
          rank_min?: string | null
          ruleset?: Json
          starts_at?: string | null
          status?: string
          team_id: string
          updated_at?: string
          window_label?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          format?: string
          game_id?: string
          id?: string
          notes?: string | null
          posted_by?: string | null
          rank_band_label?: string | null
          rank_max?: string | null
          rank_min?: string | null
          ruleset?: Json
          starts_at?: string | null
          status?: string
          team_id?: string
          updated_at?: string
          window_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrim_listings_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrim_listings_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrim_listings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      scrim_matches: {
        Row: {
          created_at: string
          format: string
          game_id: string
          id: string
          listing_id: string | null
          reported_by: string | null
          ruleset: Json
          scheduled_at: string | null
          score_a: number | null
          score_b: number | null
          status: string
          team_a: string
          team_a_confirmed: boolean
          team_b: string
          team_b_confirmed: boolean
          updated_at: string
          vod_url: string | null
          winner: string | null
        }
        Insert: {
          created_at?: string
          format?: string
          game_id: string
          id?: string
          listing_id?: string | null
          reported_by?: string | null
          ruleset?: Json
          scheduled_at?: string | null
          score_a?: number | null
          score_b?: number | null
          status?: string
          team_a: string
          team_a_confirmed?: boolean
          team_b: string
          team_b_confirmed?: boolean
          updated_at?: string
          vod_url?: string | null
          winner?: string | null
        }
        Update: {
          created_at?: string
          format?: string
          game_id?: string
          id?: string
          listing_id?: string | null
          reported_by?: string | null
          ruleset?: Json
          scheduled_at?: string | null
          score_a?: number | null
          score_b?: number | null
          status?: string
          team_a?: string
          team_a_confirmed?: boolean
          team_b?: string
          team_b_confirmed?: boolean
          updated_at?: string
          vod_url?: string | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrim_matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrim_matches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "scrim_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrim_matches_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrim_matches_team_a_fkey"
            columns: ["team_a"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrim_matches_team_b_fkey"
            columns: ["team_b"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrim_matches_winner_fkey"
            columns: ["winner"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          jersey_name: string | null
          joined_at: string
          profile_id: string
          role: string
          team_id: string
        }
        Insert: {
          id?: string
          jersey_name?: string | null
          joined_at?: string
          profile_id: string
          role?: string
          team_id: string
        }
        Update: {
          id?: string
          jersey_name?: string | null
          joined_at?: string
          profile_id?: string
          role?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          bio: string | null
          created_at: string
          game_id: string
          handler_id: string | null
          id: string
          logo_url: string | null
          name: string
          org_id: string | null
          region: string | null
          school_id: string | null
          tag: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          game_id: string
          handler_id?: string | null
          id?: string
          logo_url?: string | null
          name: string
          org_id?: string | null
          region?: string | null
          school_id?: string | null
          tag?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          game_id?: string
          handler_id?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          org_id?: string | null
          region?: string | null
          school_id?: string | null
          tag?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_handler_id_fkey"
            columns: ["handler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_entrants: {
        Row: {
          created_at: string
          id: string
          registered_by: string | null
          seed: number | null
          team_id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          registered_by?: string | null
          seed?: number | null
          team_id: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          registered_by?: string | null
          seed?: number | null
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_entrants_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_entrants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_entrants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          champion_team_id: string | null
          created_at: string
          event_id: string | null
          format: string
          game_id: string
          host_profile_id: string | null
          id: string
          name: string
          org_id: string | null
          rating_effect: boolean
          region: string | null
          scope: string
          size: number
          slug: string
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          champion_team_id?: string | null
          created_at?: string
          event_id?: string | null
          format?: string
          game_id: string
          host_profile_id?: string | null
          id?: string
          name: string
          org_id?: string | null
          rating_effect?: boolean
          region?: string | null
          scope?: string
          size?: number
          slug: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          champion_team_id?: string | null
          created_at?: string
          event_id?: string | null
          format?: string
          game_id?: string
          host_profile_id?: string | null
          id?: string
          name?: string
          org_id?: string | null
          rating_effect?: boolean
          region?: string | null
          scope?: string
          size?: number
          slug?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      head_to_head: {
        Row: {
          game_id: string | null
          hi_wins: number | null
          last_played: string | null
          lo_wins: number | null
          played: number | null
          team_hi: string | null
          team_lo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrim_matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_mentorship: { Args: { p_id: string }; Returns: undefined }
      advance_bracket_match: {
        Args: { p_match: string; p_score_a: number; p_score_b: number }
        Returns: undefined
      }
      enable_autojoin: {
        Args: {
          p_game: string
          p_mic_ok: boolean
          p_modes: string[]
          p_rank_max: string
          p_rank_min: string
        }
        Returns: number
      }
      ensure_team_rating: {
        Args: { p_game: string; p_team: string }
        Returns: undefined
      }
      ensure_team_reliability: { Args: { p_team: string }; Returns: undefined }
      expire_stale_lobbies: { Args: never; Returns: undefined }
      generate_bracket: { Args: { p_tournament: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      list_open_mentorships: {
        Args: { p_game?: string }
        Returns: {
          created_at: string
          game_id: string | null
          id: string
          kind: string
          mentee_id: string
          mentor_id: string | null
          notes: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "mentorship_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      lobby_accept_match: { Args: { p_lobby: string }; Returns: undefined }
      lobby_rank_ok: {
        Args: { p_game: string; p_max: string; p_min: string; p_rank: string }
        Returns: boolean
      }
      report_no_show: {
        Args: { p_match: string; p_offender: string }
        Returns: undefined
      }
      run_lobby_matchmaker: { Args: { p_lobby: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

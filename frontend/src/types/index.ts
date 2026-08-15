export type Mode = 'couple' | 'amis' | 'solo';
export type Category = 'general' | 'jeux_ensemble' | 'mieux_connaitre' | 'manga';
export type Level = 'facile' | 'moyen' | 'difficile' | 'impossible';
export type ContentType = 'question' | 'enigme' | 'defi';

export interface UserProfile {
  id: string;
  pseudo: string;
  age: number | null;
  mode_prefere: Mode;
  created_at: string;
}

export interface Couple {
  id: string;
  mode: 'couple' | 'amis';
  nom: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface ContentItem {
  id: string;
  content_type: ContentType;
  category: Category;
  subcategory: string;
  mode_scope: Mode | 'tous';
  type: string;
  level: Level;
  text: string;
  answer: string | null;
  variants: { choix?: string[] } | null;
  explanation: string | null;
  manga_series: string | null;
  temps_suggere: number;
}

export interface GameSession {
  id: string;
  mode: Mode;
  couple_id: string | null;
  created_by: string;
  category: Category;
  subcategory: string | null;
  status: 'en_attente' | 'en_cours' | 'terminee';
  started_at: string;
  ended_at: string | null;
}

export interface SessionItem {
  id: string;
  session_id: string;
  content_id: string;
  order_index: number;
  revealed: boolean;
  time_limit: number | null;
  content?: ContentItem;
}

export interface SessionAnswer {
  id: string;
  session_item_id: string;
  user_id: string;
  answer: string;
  is_correct: boolean | null;
  time_spent: number | null;
  answered_at: string;
}

export interface ChatMessage {
  id: string;
  couple_id: string;
  sender_id: string;
  content: string;
  session_ref: string | null;
  created_at: string;
  read: boolean;
}

export interface StatRow {
  id: string;
  user_id: string;
  couple_id: string | null;
  category: Category;
  sessions_count: number;
  victoires: number;
  defaites: number;
  nuls: number;
}

export type ChipMode = "review_funnel" | "instagram" | "pdf_menu" | "interactive_menu";
export type BillingStatus = "al_dia" | "pendiente" | "atrasado";

// Nota: estos son `type`, no `interface`, a propósito. @supabase/postgrest-js
// (instalado: 2.112.x) exige que Row/Insert/Update satisfagan
// Record<string, unknown> en checks de tipo condicional ("T extends
// Record<string, unknown>") para poder resolver los genéricos de
// createClient<Database>() — una `interface` NO lo satisface ahí (aunque sí
// es asignable en la práctica) por cómo TS trata las interfaces open-ended
// en posición de "extends" de un tipo condicional, y todo el tipado de
// `.insert()`/`.update()`/`.select()` colapsa en silencio a `never`. Con
// `type` funciona. Ver commit que agrega este comentario para el repro.
export type Client = {
  id: string;
  business_name: string;
  owner_whatsapp: string;
  owner_email: string | null;
  logo_url: string | null;
  created_at: string;
  monthly_fee: number | null;
  billing_status: BillingStatus;
  next_billing_date: string | null;
  client_since: string | null;
};

export type Chip = {
  id: string;
  chip_code: string;
  client_id: string | null;
  mode: ChipMode;
  destination_url: string | null;
  is_active: boolean;
  menu_pdf_url: string | null;
  created_at: string;
  activated_at: string | null;
};

export type ChipWithClient = Chip & {
  clients: Client | null;
};

export type TapEvent = {
  id: string;
  chip_id: string;
  user_agent: string | null;
  created_at: string;
};

export type Feedback = {
  id: string;
  chip_id: string;
  rating: number;
  comment: string | null;
  customer_contact: string | null;
  notified: boolean;
  created_at: string;
};

export interface ChipMetricRow {
  chip_id: string;
  chip_code: string;
  client_id: string | null;
  mode: ChipMode;
  is_active: boolean;
  business_name: string | null;
  total_taps: number;
  total_feedbacks: number;
  negative_feedbacks: number;
  days_since_last_tap: number | null;
}

export interface ClientSummaryRow {
  client_id: string;
  business_name: string;
  billing_status: BillingStatus;
  active_chips: number;
  total_taps: number;
  last_tap_at: string | null;
}

// @supabase/postgrest-js exige que cada tabla tenga "Relationships" (aunque
// esté vacío) y que el schema tenga "Views"/"Functions" — sin esto, el
// generic de createClient<Database> no matchea GenericSchema y todos los
// .insert()/.select() colapsan silenciosamente a "never" (rompe `next build`
// aunque `next dev` no lo muestre). No usamos relaciones declaradas aquí
// porque los joins (`select("*, clients(*)")`) siguen funcionando en runtime
// vía PostgREST; esto es solo para que el tipado no se caiga.
export interface Database {
  public: {
    Tables: {
      clients: {
        Row: Client;
        // owner_email/monthly_fee/next_billing_date son nullable sin default;
        // billing_status y client_since tienen default en SQL (ver schema.sql)
        // — todos opcionales al insertar, igual que id/created_at.
        Insert: Omit<
          Client,
          "id" | "created_at" | "owner_email" | "monthly_fee" | "billing_status" | "next_billing_date" | "client_since"
        > & {
          id?: string;
          created_at?: string;
          owner_email?: string | null;
          monthly_fee?: number | null;
          billing_status?: BillingStatus;
          next_billing_date?: string | null;
          client_since?: string | null;
        };
        Update: Partial<Omit<Client, "id">>;
        Relationships: [];
      };
      chips: {
        Row: Chip;
        Insert: Omit<Chip, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Chip, "id">>;
        // Necesario para que `.select("*, clients(*)")` (usado en
        // app/r/[chip_code]/page.tsx, api/feedback, api/chips/lookup) resuelva
        // el join embebido en vez de colapsar a never.
        Relationships: [
          {
            foreignKeyName: "chips_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      tap_events: {
        Row: TapEvent;
        Insert: Omit<TapEvent, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<TapEvent, "id">>;
        Relationships: [];
      };
      feedbacks: {
        Row: Feedback;
        Insert: Omit<Feedback, "id" | "created_at" | "notified"> & {
          id?: string;
          created_at?: string;
          notified?: boolean;
        };
        Update: Partial<Omit<Feedback, "id">>;
        // Necesario para que `.select("*, chips(*, clients(*))")` (usado en
        // app/api/feedback/list) resuelva el join embebido en vez de
        // colapsar a never — mismo motivo que Relationships en chips arriba.
        Relationships: [
          {
            foreignKeyName: "feedbacks_chip_id_fkey";
            columns: ["chip_id"];
            isOneToOne: false;
            referencedRelation: "chips";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

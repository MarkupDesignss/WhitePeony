export interface CurrencyData {
    code: string;
    value: number;
  }
  
  export interface CurrencyResponse {
    data: Record<string, CurrencyData>;
    meta: {
      last_updated_at: string;
    };
  }
  
  export interface UserProfile {
    id: string;
    name: string;
  }
  
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    has(key: string): boolean;
    toObject(): Record<string, string>;
  }

  export const env: Env;

  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: any
  ): void;
}

declare module 'https://deno.land/std@*' {
  export const serve: any;
  export const crypto: any;
  const content: any;
  export default content;
}

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export const serve: (handler: (req: Request) => Response | Promise<Response>, options?: any) => void;
  const content: any;
  export default content;
}

declare module 'https://deno.land/std@0.168.0/crypto/mod.ts' {
  export const crypto: any;
  export const createHmac: any;
  const content: any;
  export default content;
}

declare module 'https://esm.sh/@supabase/supabase-js@*' {
  export const createClient: any;
  export type SupabaseClient = any;
  const content: any;
  export default content;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export const createClient: any;
  export type SupabaseClient = any;
  const content: any;
  export default content;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.39.0' {
  export const createClient: any;
  export type SupabaseClient = any;
  const content: any;
  export default content;
}

declare module 'https://*' {
  const content: any;
  export default content;
  export const serve: any;
  export const createClient: any;
  export const crypto: any;
}

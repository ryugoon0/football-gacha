// 진입점. 실제 로직은 handler.ts에 있고, 그래야 Deno 없이도 시험할 수 있습니다.
import { handle } from './handler.ts'

Deno.serve((request: Request) =>
  handle(request, {
    url: Deno.env.get('SUPABASE_URL') ?? '',
    anon: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    service: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  }),
)

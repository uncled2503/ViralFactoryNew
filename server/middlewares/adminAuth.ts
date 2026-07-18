import { Request, Response, NextFunction } from 'express';
import { LocalDbMutex } from '../database/LocalDbMutex';
import { supabaseAdmin, isSupabaseConfigured } from '../database/supabaseClient';

export async function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    let userId: string | null = null;
    let email: string | null = null;

    // 1. Try to extract from Authorization header (Supabase JWT or plain ID)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (isSupabaseConfigured() && supabaseAdmin) {
        try {
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
          if (!error && user) {
            userId = user.id;
            email = user.email || null;
          }
        } catch (e: any) {
          console.error('[Admin Auth Middleware] Supabase JWT verification failed:', e.message);
        }
      }
      
      // If token is representing a local ID (when Supabase is offline)
      if (!userId && token.length > 5) {
        userId = token;
      }
    }

    // 2. Fallback to custom header or query/body parameters for local/sandbox development
    if (!userId) {
      userId = (req.headers['x-user-id'] || req.query.userId || req.body.userId) as string;
    }

    if (!userId) {
      res.status(401).json({ error: 'Não autorizado. Token de autenticação administrativo ausente.' });
      return;
    }

    // 3. Load user from database and check role
    const dbData = await LocalDbMutex.loadDb();
    const users = dbData.saas_users || dbData.users || [];
    const user = users.find((u: any) => u.id === userId);

    if (!user) {
      // Allow bypass for the master system owner ID or email if database is initializing
      const isBypass = userId === '00000000-0000-0000-0000-000000000001' || email === 'mouragabriel2011@gmail.com';
      if (isBypass) {
        (req as any).adminName = 'Gabriel Moura (Bypass)';
        (req as any).adminRole = 'owner';
        return next();
      }
      res.status(403).json({ error: 'Acesso negado. Usuário administrativo não encontrado.' });
      return;
    }

    // Normalized check for administrative roles
    const userRole = (user.role || '').toLowerCase();
    const isAdmin = ['owner', 'saas_owner', 'admin', 'super_admin'].includes(userRole) || 
                    user.id === '00000000-0000-0000-0000-000000000001' || 
                    user.email === 'mouragabriel2011@gmail.com';

    if (!isAdmin) {
      res.status(403).json({ error: 'Acesso negado. Esta área é restrita para administradores.' });
      return;
    }

    // Attach credentials to request object
    (req as any).adminName = user.name || 'SaaS Admin';
    (req as any).adminRole = user.role || 'admin';
    (req as any).adminUserId = user.id;

    next();
  } catch (err: any) {
    console.error('[Admin Auth Middleware] Error:', err);
    res.status(500).json({ error: 'Erro interno na validação de permissões administrativas.' });
  }
}

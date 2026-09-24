import { Request, Response, NextFunction } from 'express';
import { LocalDbMutex } from '../database/LocalDbMutex';
import { getAuthenticatedUser } from '../utils/authHelper';

// The one email allowed to bootstrap as SaaS_Owner before any admin row exists for it in the
// database. Only ever honored for an IDENTITY THAT WAS ALREADY VERIFIED by getAuthenticatedUser
// (a real Supabase JWT, or the offline/local-dev fallback) — never trusted from a raw header.
const MASTER_BOOTSTRAP_EMAIL = (process.env.ADMIN_MASTER_EMAIL || 'mouragabriel2011@gmail.com').toLowerCase().trim();

const ADMIN_ROLES = new Set([
  'owner', 'saas_owner', 'saas owner', 'admin', 'super_admin', 'super admin',
  'gerente', 'suporte', 'financeiro', 'moderador', 'administrador',
]);

function logAdminAuthAudit(data: {
  endpoint: string;
  method: string;
  userId: string;
  email: string;
  role: string;
  jwtValid: boolean;
  rejectionReason: string | null;
}) {
  console.log(`
================== [ADMIN AUTH AUDIT LOG] ==================
Endpoint: ${data.method} ${data.endpoint}
User ID: ${data.userId}
Email: ${data.email}
Role: ${data.role}
Status: ${data.rejectionReason ? 'REJEITADO' : 'APROVADO'}
${data.rejectionReason ? `Motivo da Rejeição: ${data.rejectionReason}` : 'Acesso concedido com privilégios administrativos.'}
============================================================
`);
}

export async function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const endpoint = req.originalUrl || req.url;
  const method = req.method;

  try {
    // 1. Resolve identity from a verified Supabase JWT (or the offline/local-dev fallback).
    // SECURITY: never accept a client-supplied userId/email as trusted identity — see authHelper.
    const authUser = await getAuthenticatedUser(req);

    if (!authUser || !authUser.userId) {
      const rejectionReason = 'Não autorizado. Token de autenticação ausente ou inválido.';
      logAdminAuthAudit({ endpoint, method, userId: 'N/A', email: 'N/A', role: 'N/A', jwtValid: false, rejectionReason });
      res.status(401).json({ error: rejectionReason });
      return;
    }

    const { userId } = authUser;
    let email = authUser.email;

    // 2. Load database and match the verified identity to a SaaS user record.
    const dbData = await LocalDbMutex.loadDb();
    const users = dbData.saas_users || dbData.users || [];
    let user = users.find((u: any) =>
      u.id === userId || (email && u.email && u.email.toLowerCase().trim() === email.toLowerCase().trim())
    );

    // Bootstrap fallback: only for the configured master email, and only once that email has
    // already been verified above (Supabase JWT, or trusted local-dev lookup) — never from a
    // client-supplied header.
    const isVerifiedMaster = !!email && email.toLowerCase().trim() === MASTER_BOOTSTRAP_EMAIL;
    if (!user && isVerifiedMaster) {
      user = {
        id: userId,
        name: 'Gabriel Moura',
        email,
        role: 'SaaS_Owner',
        subscription: 'Pro',
        subscription_tier: 'Pro',
      };
    }

    if (!user) {
      const rejectionReason = `Usuário (id=${userId}, email=${email || 'N/A'}) não localizado no banco de dados.`;
      logAdminAuthAudit({ endpoint, method, userId, email: email || 'N/A', role: 'N/A', jwtValid: true, rejectionReason });
      res.status(403).json({ error: rejectionReason });
      return;
    }

    const role = user.role || 'Membro';
    const roleNorm = role.toString().trim().toLowerCase();
    const isAdmin = isVerifiedMaster || ADMIN_ROLES.has(roleNorm);

    if (!isAdmin) {
      const rejectionReason = `Acesso negado para a função '${role}'. Requer privilégios de administrador.`;
      logAdminAuthAudit({ endpoint, method, userId: user.id, email: user.email, role, jwtValid: true, rejectionReason });
      res.status(403).json({ error: rejectionReason });
      return;
    }

    logAdminAuthAudit({ endpoint, method, userId: user.id, email: user.email, role, jwtValid: true, rejectionReason: null });

    (req as any).adminName = user.name || 'SaaS Admin';
    (req as any).adminRole = role;
    (req as any).adminUserId = user.id;
    (req as any).adminEmail = user.email;

    next();
  } catch (err: any) {
    console.error('[Admin Auth Middleware] Error:', err);
    res.status(500).json({ error: 'Erro interno no middleware administrativo.' });
  }
}

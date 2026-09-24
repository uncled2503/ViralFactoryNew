import { Request, Response, NextFunction } from 'express';

// Mirrors the UserRole union in src/types.ts (kept case-insensitive since the frontend sends
// mixed-case values like 'SaaS_Owner' or 'Membro').
const VALID_ROLES = new Set([
  'super_admin', 'saas_owner', 'owner', 'admin', 'suporte', 'financeiro', 'marketing',
  'moderador', 'analista', 'desenvolvedor', 'support', 'finance', 'moderator',
  'client_owner', 'client_member', 'membro', 'user',
]);

export class AdminValidators {
  static validateUpdateUser(req: Request, res: Response, next: NextFunction) {
    const { name, email, role, status } = req.body;

    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      res.status(400).json({ error: 'Formato de e-mail inválido.' });
      return;
    }

    if (role && !VALID_ROLES.has(role.toString().trim().toLowerCase())) {
      res.status(400).json({ error: 'Função (role) de usuário inválida.' });
      return;
    }

    if (status && !['active', 'suspended', 'pending'].includes(status)) {
      res.status(400).json({ error: 'Status de usuário inválido.' });
      return;
    }

    next();
  }

  static validateSetting(req: Request, res: Response, next: NextFunction) {
    const { key, value } = req.body;

    if (!key || typeof key !== 'string') {
      res.status(400).json({ error: 'A chave de configuração é obrigatória e deve ser texto.' });
      return;
    }

    if (value === undefined) {
      res.status(400).json({ error: 'O valor de configuração é obrigatório.' });
      return;
    }

    next();
  }

  static validateCoupon(req: Request, res: Response, next: NextFunction) {
    const { code, type, value } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      res.status(400).json({ error: 'O código do cupom é obrigatório.' });
      return;
    }

    if (!['percentage', 'fixed'].includes(type)) {
      res.status(400).json({ error: "O tipo do cupom deve ser 'percentage' ou 'fixed'." });
      return;
    }

    const numValue = Number(value);
    if (!Number.isFinite(numValue) || numValue <= 0 || (type === 'percentage' && numValue > 100)) {
      res.status(400).json({ error: 'Valor de desconto inválido.' });
      return;
    }

    next();
  }

  static validatePlan(req: Request, res: Response, next: NextFunction) {
    const { tier, name, monthlyPrice, annualPrice, maxVideos, maxStorageGB, priority } = req.body;

    if (!tier || typeof tier !== 'string' || !tier.trim()) {
      res.status(400).json({ error: 'O tier do plano é obrigatório.' });
      return;
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'O nome do plano é obrigatório.' });
      return;
    }

    if (monthlyPrice === undefined || Number(monthlyPrice) < 0) {
      res.status(400).json({ error: 'Preço mensal inválido.' });
      return;
    }

    if (maxVideos === undefined || Number(maxVideos) < 0) {
      res.status(400).json({ error: 'Limite de vídeos inválido.' });
      return;
    }

    if (maxStorageGB === undefined || Number(maxStorageGB) < 0) {
      res.status(400).json({ error: 'Limite de armazenamento inválido.' });
      return;
    }

    if (annualPrice !== undefined && (!Number.isFinite(Number(annualPrice)) || Number(annualPrice) < 0)) {
      res.status(400).json({ error: 'Preço anual inválido.' });
      return;
    }

    if (priority !== undefined && !['low', 'normal', 'high', 'vip'].includes(priority)) {
      res.status(400).json({ error: 'Prioridade de plano inválida.' });
      return;
    }

    next();
  }

  // Unlike validatePlan (create — every field required), this only validates fields that are
  // actually present in a PATCH body, since a partial update legitimately omits most of them.
  static validatePlanUpdate(req: Request, res: Response, next: NextFunction) {
    const { tier, name, monthlyPrice, annualPrice, maxVideos, maxStorageGB, priority } = req.body;

    if (tier !== undefined && (typeof tier !== 'string' || !tier.trim())) {
      res.status(400).json({ error: 'O tier do plano é inválido.' });
      return;
    }
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      res.status(400).json({ error: 'O nome do plano é inválido.' });
      return;
    }
    if (monthlyPrice !== undefined && (!Number.isFinite(Number(monthlyPrice)) || Number(monthlyPrice) < 0)) {
      res.status(400).json({ error: 'Preço mensal inválido.' });
      return;
    }
    if (annualPrice !== undefined && (!Number.isFinite(Number(annualPrice)) || Number(annualPrice) < 0)) {
      res.status(400).json({ error: 'Preço anual inválido.' });
      return;
    }
    if (maxVideos !== undefined && (!Number.isFinite(Number(maxVideos)) || Number(maxVideos) < 0)) {
      res.status(400).json({ error: 'Limite de vídeos inválido.' });
      return;
    }
    if (maxStorageGB !== undefined && (!Number.isFinite(Number(maxStorageGB)) || Number(maxStorageGB) < 0)) {
      res.status(400).json({ error: 'Limite de armazenamento inválido.' });
      return;
    }
    if (priority !== undefined && !['low', 'normal', 'high', 'vip'].includes(priority)) {
      res.status(400).json({ error: 'Prioridade de plano inválida.' });
      return;
    }

    next();
  }
}

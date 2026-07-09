import { Request, Response, NextFunction } from 'express';

export class AdminValidators {
  static validateUpdateUser(req: Request, res: Response, next: NextFunction) {
    const { name, email, role, status } = req.body;

    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      res.status(400).json({ error: 'Formato de e-mail inválido.' });
      return;
    }

    if (role && !['user', 'admin', 'owner'].includes(role)) {
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
}

import { Request, Response, NextFunction } from 'express';

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // In future production with Auth headers, we will verify the JWT token
  // with Supabase Auth or standard Auth.
  // Currently, we attach standard identity for attribution in SaaS audit logs.
  (req as any).adminName = 'SaaS Admin';
  (req as any).adminRole = 'owner';
  
  next();
}

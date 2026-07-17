import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as supabaseClient from '../server/database/supabaseClient';
import { LocalDbMutex } from '../server/database/LocalDbMutex';
import { AdminRepository } from '../server/repositories/AdminRepository';

describe('Database Fallback & Concurrency Mutex Tests', () => {
  beforeAll(async () => {
    // Force offline/fallback mode for testing mock fallbacks
    vi.spyOn(supabaseClient, 'isSupabaseConfigured').mockReturnValue(false);

    // Warm-up database memory cache with mocks
    await LocalDbMutex.loadDb();
  });

  it('should run writes atomically and sequentially', async () => {
    // Initial write
    await LocalDbMutex.runLocked((db) => {
      db.counter = 0;
    });

    const numOperations = 50;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < numOperations; i++) {
      promises.push(
        LocalDbMutex.runLocked(async (db) => {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
          db.counter = (db.counter || 0) + 1;
        })
      );
    }

    await Promise.all(promises);

    // Read final state
    const finalState = await LocalDbMutex.runLocked((db) => db);
    expect(finalState.counter).toBe(numOperations);
  });

  it('should create and read admin mock database fallback', async () => {
    const users = await AdminRepository.getUsers();
    expect(users).toBeInstanceOf(Array);
    expect(users.length).toBeGreaterThan(0);
    expect(users[0].email).toBe('mouragabriel2011@gmail.com');
  });

  it('should update user inside the admin mock database fallback', async () => {
    const originalUsers = await AdminRepository.getUsers();
    const testUserId = originalUsers[0].id;

    const updatedUser = await AdminRepository.updateUser(testUserId, {
      name: 'Gabriel Moura Atualizado',
      company: 'Viral S.A. Tech'
    });

    expect(updatedUser).toBeDefined();
    expect(updatedUser.name).toBe('Gabriel Moura Atualizado');
    expect(updatedUser.company).toBe('Viral S.A. Tech');

    // Fetch again to verify persistence
    const refetchedUsers = await AdminRepository.getUsers();
    const matched = refetchedUsers.find(u => u.id === testUserId);
    expect(matched?.name).toBe('Gabriel Moura Atualizado');
  });
});

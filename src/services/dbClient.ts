/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const envSource = (import.meta as any).env || {};
const SUPABASE_URL = envSource.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envSource.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return (
    !!SUPABASE_URL &&
    !!SUPABASE_ANON_KEY &&
    SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
    SUPABASE_ANON_KEY !== 'your-anon-key'
  );
};

// Initialize Supabase Client with public ANON KEY only (never service_role)
export const supabaseClient = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Database Adapter Interface to achieve perfect loose coupling
// In the future, this can be swapped with Prisma or direct PG client without touching services or UI
export interface IDatabaseClient {
  findOne<T>(table: string, filter: Record<string, any>): Promise<T | null>;
  findMany<T>(table: string, filter?: Record<string, any>, options?: { orderBy?: string; orderAsc?: boolean; limit?: number }): Promise<T[]>;
  insert<T>(table: string, data: Record<string, any>): Promise<T | null>;
  update<T>(table: string, filter: Record<string, any>, data: Record<string, any>): Promise<T | null>;
  delete(table: string, filter: Record<string, any>): Promise<boolean>;
  upsert<T>(table: string, data: Record<string, any>, conflictKeys?: string[]): Promise<T | null>;
}

// Memory & LocalStorage Fallback for perfect offline compatibility
class LocalStorageDbClient implements IDatabaseClient {
  private getStorageKey(table: string): string {
    return `vf_offline_${table}`;
  }

  private getData(table: string): any[] {
    const data = localStorage.getItem(this.getStorageKey(table));
    return data ? JSON.parse(data) : [];
  }

  private saveData(table: string, data: any[]) {
    localStorage.setItem(this.getStorageKey(table), JSON.stringify(data));
  }

  async findOne<T>(table: string, filter: Record<string, any>): Promise<T | null> {
    const data = this.getData(table);
    const item = data.find(item => 
      Object.entries(filter).every(([key, val]) => item[key] === val)
    );
    return item || null;
  }

  async findMany<T>(table: string, filter?: Record<string, any>, options?: { orderBy?: string; orderAsc?: boolean; limit?: number }): Promise<T[]> {
    let data = this.getData(table);
    if (filter) {
      data = data.filter(item => 
        Object.entries(filter).every(([key, val]) => item[key] === val)
      );
    }
    
    if (options?.orderBy) {
      const field = options.orderBy;
      data.sort((a, b) => {
        if (a[field] < b[field]) return options.orderAsc !== false ? -1 : 1;
        if (a[field] > b[field]) return options.orderAsc !== false ? 1 : -1;
        return 0;
      });
    }

    if (options?.limit) {
      data = data.slice(0, options.limit);
    }

    return data;
  }

  async insert<T>(table: string, data: Record<string, any>): Promise<T | null> {
    const items = this.getData(table);
    items.push(data);
    this.saveData(table, items);
    return data as T;
  }

  async update<T>(table: string, filter: Record<string, any>, data: Record<string, any>): Promise<T | null> {
    const items = this.getData(table);
    let updatedItem: T | null = null;
    const nextItems = items.map(item => {
      const matches = Object.entries(filter).every(([key, val]) => item[key] === val);
      if (matches) {
        const newItem = { ...item, ...data };
        updatedItem = newItem as T;
        return newItem;
      }
      return item;
    });
    this.saveData(table, nextItems);
    return updatedItem;
  }

  async delete(table: string, filter: Record<string, any>): Promise<boolean> {
    const items = this.getData(table);
    const initialLen = items.length;
    const nextItems = items.filter(item => 
      !Object.entries(filter).every(([key, val]) => item[key] === val)
    );
    this.saveData(table, nextItems);
    return nextItems.length < initialLen;
  }

  async upsert<T>(table: string, data: Record<string, any>, conflictKeys: string[] = ['id']): Promise<T | null> {
    const items = this.getData(table);
    const index = items.findIndex(item => 
      conflictKeys.every(key => item[key] === data[key])
    );

    if (index !== -1) {
      items[index] = { ...items[index], ...data };
    } else {
      items.push(data);
    }

    this.saveData(table, items);
    return data as T;
  }
}

// Supabase implementation of the Database Client Interface
class SupabaseDbClient implements IDatabaseClient {
  async findOne<T>(table: string, filter: Record<string, any>): Promise<T | null> {
    if (!supabaseClient) return null;
    let query = supabaseClient.from(table).select('*');
    Object.entries(filter).forEach(([key, val]) => {
      query = query.eq(key, val);
    });
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.warn(`Query single error for ${table} (table might not exist yet):`, error.message);
      return null;
    }
    return data as T;
  }

  async findMany<T>(table: string, filter?: Record<string, any>, options?: { orderBy?: string; orderAsc?: boolean; limit?: number }): Promise<T[]> {
    if (!supabaseClient) return [];
    let query = supabaseClient.from(table).select('*');
    if (filter) {
      Object.entries(filter).forEach(([key, val]) => {
        query = query.eq(key, val);
      });
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderAsc !== false });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.warn(`Query list error for ${table} (table might not exist yet):`, error.message);
      return [];
    }
    return data as T[];
  }

  async insert<T>(table: string, data: Record<string, any>): Promise<T | null> {
    if (!supabaseClient) return null;
    const { data: inserted, error } = await supabaseClient.from(table).insert(data).select().maybeSingle();
    if (error) {
      console.warn(`Insert error for ${table}:`, error.message);
      return null;
    }
    return inserted as T;
  }

  async update<T>(table: string, filter: Record<string, any>, data: Record<string, any>): Promise<T | null> {
    if (!supabaseClient) return null;
    let query = supabaseClient.from(table).update(data);
    Object.entries(filter).forEach(([key, val]) => {
      query = query.eq(key, val);
    });
    const { data: updated, error } = await query.select().maybeSingle();
    if (error) {
      console.warn(`Update error for ${table}:`, error.message);
      return null;
    }
    return updated as T;
  }

  async delete(table: string, filter: Record<string, any>): Promise<boolean> {
    if (!supabaseClient) return false;
    let query = supabaseClient.from(table).delete();
    Object.entries(filter).forEach(([key, val]) => {
      query = query.eq(key, val);
    });
    const { error } = await query;
    if (error) {
      console.warn(`Delete error for ${table}:`, error.message);
      return false;
    }
    return true;
  }

  async upsert<T>(table: string, data: Record<string, any>, conflictKeys: string[] = ['id']): Promise<T | null> {
    if (!supabaseClient) return null;
    const onConflict = conflictKeys.join(',');
    const { data: upserted, error } = await supabaseClient.from(table).upsert(data, { onConflict }).select().maybeSingle();
    if (error) {
      console.warn(`Upsert error for ${table}:`, error.message);
      return null;
    }
    return upserted as T;
  }
}

// Instantiate the appropriate database provider
export const db: IDatabaseClient = isSupabaseConfigured()
  ? new SupabaseDbClient()
  : new LocalStorageDbClient();

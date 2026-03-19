// Auto-generated: CRUD for users

import { supabase } from '../client';
import type { users } from '../types';

// Filter type definition
type FilterValue = string | number | boolean | null;
type Filters = Record<string, FilterValue | FilterValue[]>;

/** Select all */
export async function selectUsersRows(): Promise<users[]> {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching all users:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
    if (!data) {
      return [];
    }
    return data as users[];
  } catch (error) {
    console.error('Unexpected error in selectUsersRows:', error);
    throw error;
  }
}

/** Select by ID */
export async function selectUsersRowById({ id }: { id: string }): Promise<users | null> {
  if (!id) {
    throw new Error('ID is required');
  }
  try {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) {
      // Return null when record not found (PGRST116)
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching users by ID:', error);
      throw new Error(`Failed to fetch users with ID ${id}: ${error.message}`);
    }
    return data as users | null;
  } catch (error) {
    console.error('Unexpected error in selectUsersRowById:', error);
    throw error;
  }
}

/** Select multiple by filters */
export async function selectUsersRowsWithFilters({ filters }: { filters: Filters }): Promise<users[]> {
  // Guard for filters
  if (!filters || typeof filters !== 'object') return [];
  try {
    let query = supabase.from('users').select('*');
    
    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching users by filters:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
    return (data as unknown as users[]) || [];
  } catch (error) {
    console.error('Unexpected error in selectUsersRowsWithFilters:', error);
    throw error;
  }
}

/** Insert */
export async function insertUsersRow({ data }: { data: Omit<users, 'id' | 'created_at' | 'updated_at'> }): Promise<users> {
  if (!data) {
    throw new Error('Data is required for creation');
  }
  try {
    const { data: createdData, error } = await supabase
      .from('users')
      .insert([data])
      .select()
      .single();
    if (error) {
      console.error('Error creating users:', error);
      throw new Error(`Failed to create users: ${error.message}`);
    }
    if (!createdData) {
      throw new Error('No data returned after creation');
    }
    return createdData as users;
  } catch (error) {
    console.error('Unexpected error in insertUsersRow:', error);
    throw error;
  }
}

/** Update */
export async function updateUsersRow({ id, data }: { id: string; data: Partial<Omit<users, 'id' | 'created_at'>> }): Promise<users> {
  if (!id) {
    throw new Error('ID is required for update');
  }
  if (!data || Object.keys(data).length === 0) {
    throw new Error('Update data is required');
  }
  try {
    const { data: updatedData, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(`users with ID ${id} not found`);
      }
      console.error('Error updating users:', error);
      throw new Error(`Failed to update users with ID ${id}: ${error.message}`);
    }
    if (!updatedData) {
      throw new Error(`users with ID ${id} not found`);
    }
    return updatedData as users;
  } catch (error) {
    console.error('Unexpected error in updateUsersRow:', error);
    throw error;
  }
}

/** Delete */
export async function deleteUsersRow({ id }: { id: string }): Promise<boolean> {
  if (!id) {
    throw new Error('ID is required for deletion');
  }
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting users:', error);
      throw new Error(`Failed to delete users with ID ${id}: ${error.message}`);
    }
    return true;
  } catch (error) {
    console.error('Unexpected error in deleteUsersRow:', error);
    throw error;
  }
}


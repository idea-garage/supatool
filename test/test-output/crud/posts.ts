// 自動生成: posts用CRUD関数

import { supabase } from '../client';
import type { posts } from '../types';

// フィルター型定義
type FilterValue = string | number | boolean | null;
type Filters = Record<string, FilterValue | FilterValue[]>;

/** 全件取得 */
export async function selectPostsRows(): Promise<posts[]> {
  try {
    const { data, error } = await supabase.from('posts').select('*');
    if (error) {
      console.error('Error fetching all posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
    if (!data) {
      return [];
    }
    return data as posts[];
  } catch (error) {
    console.error('Unexpected error in selectPostsRows:', error);
    throw error;
  }
}

/** IDで1件取得 */
export async function selectPostsRowById({ id }: { id: string }): Promise<posts | null> {
  if (!id) {
    throw new Error('ID is required');
  }
  try {
    const { data, error } = await supabase.from('posts').select('*').eq('id', id).single();
    if (error) {
      // レコードが見つからない場合（PGRST116）は null を返す
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching posts by ID:', error);
      throw new Error(`Failed to fetch posts with ID ${id}: ${error.message}`);
    }
    return data as posts | null;
  } catch (error) {
    console.error('Unexpected error in selectPostsRowById:', error);
    throw error;
  }
}

/** フィルターで複数件取得 */
export async function selectPostsRowsWithFilters({ filters }: { filters: Filters }): Promise<posts[]> {
  // filtersのガード
  if (!filters || typeof filters !== 'object') return [];
  try {
    let query = supabase.from('posts').select('*');
    
    // フィルターを適用
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching posts by filters:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
    return (data as unknown as posts[]) || [];
  } catch (error) {
    console.error('Unexpected error in selectPostsRowsWithFilters:', error);
    throw error;
  }
}

/** 新規作成 */
export async function insertPostsRow({ data }: { data: Omit<posts, 'id' | 'created_at' | 'updated_at'> }): Promise<posts> {
  if (!data) {
    throw new Error('Data is required for creation');
  }
  try {
    const { data: createdData, error } = await supabase
      .from('posts')
      .insert([data])
      .select()
      .single();
    if (error) {
      console.error('Error creating posts:', error);
      throw new Error(`Failed to create posts: ${error.message}`);
    }
    if (!createdData) {
      throw new Error('No data returned after creation');
    }
    return createdData as posts;
  } catch (error) {
    console.error('Unexpected error in insertPostsRow:', error);
    throw error;
  }
}

/** 更新 */
export async function updatePostsRow({ id, data }: { id: string; data: Partial<Omit<posts, 'id' | 'created_at'>> }): Promise<posts> {
  if (!id) {
    throw new Error('ID is required for update');
  }
  if (!data || Object.keys(data).length === 0) {
    throw new Error('Update data is required');
  }
  try {
    const { data: updatedData, error } = await supabase
      .from('posts')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(`posts with ID ${id} not found`);
      }
      console.error('Error updating posts:', error);
      throw new Error(`Failed to update posts with ID ${id}: ${error.message}`);
    }
    if (!updatedData) {
      throw new Error(`posts with ID ${id} not found`);
    }
    return updatedData as posts;
  } catch (error) {
    console.error('Unexpected error in updatePostsRow:', error);
    throw error;
  }
}

/** 削除 */
export async function deletePostsRow({ id }: { id: string }): Promise<boolean> {
  if (!id) {
    throw new Error('ID is required for deletion');
  }
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting posts:', error);
      throw new Error(`Failed to delete posts with ID ${id}: ${error.message}`);
    }
    return true;
  } catch (error) {
    console.error('Unexpected error in deletePostsRow:', error);
    throw error;
  }
}


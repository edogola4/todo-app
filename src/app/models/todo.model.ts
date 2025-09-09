export type Priority = 'low' | 'medium' | 'high';

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface Todo {
  id: string;
  title: string;
  content: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  priority: Priority;
  category: string;
  tags: string[];
  isPinned: boolean;
  notes?: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
}

export interface TodoFilterOptions {
  status?: 'all' | 'active' | 'completed';
  priority?: Priority | 'all';
  category?: string;
  tags?: string[];
  searchTerm?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface TodoStats {
  total: number;
  completed: number;
  active: number;
  byPriority: Record<Priority, number>;
  byCategory: Record<string, number>;
  byTag: Record<string, number>;
}
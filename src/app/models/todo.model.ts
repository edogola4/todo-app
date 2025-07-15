export interface Todo {
    id: string;
    title: string;
    content: string;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
    priority: 'low' | 'medium' | 'high';
    category: string;
  }
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const articles = sqliteTable('articles', { id: text('id').primaryKey(), title: text('title').notNull(), source: text('source').notNull(), category: text('category').notNull(), publishedAt: text('published_at'), status: text('status').notNull(), updatedAt: text('updated_at').notNull(), payload: text('payload').notNull() });
export const syncState = sqliteTable('sync_state', { id: text('id').primaryKey(), payload: text('payload').notNull() });

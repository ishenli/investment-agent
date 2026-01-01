import { BaseModel } from '@renderer/database/core';
import { DBModel } from '@renderer/database/core/types/db';
import { DB_Thread, DB_ThreadSchema } from '@renderer/database/schemas/thread';
import { CreateThreadParams, ThreadItem, ThreadStatus, ThreadType } from '@typings/topic';
import { nanoid } from '@renderer/lib/utils/uuid';

export interface QueryThreadParams {
  current?: number;
  pageSize?: number;
  topicId?: string;
}

class _ThreadModel extends BaseModel {
  constructor() {
    super('threads', DB_ThreadSchema);
  }

  // **************** Query *************** //

  async query({ pageSize = 9999, current = 0, topicId }: QueryThreadParams = {}): Promise<
    ThreadItem[]
  > {
    const offset = current * pageSize;

    let allThreads: DBModel<DB_Thread>[];

    if (topicId) {
      allThreads = await this.table.where('topicId').equals(topicId).reverse().sortBy('updatedAt');
    } else {
      allThreads = await this.table.orderBy('updatedAt').reverse().toArray();
    }

    const pagedThreads = allThreads.slice(offset, offset + pageSize);
    return pagedThreads.map((thread) => this.mapToThreadItem(thread));
  }

  async queryByTopicId(topicId: string): Promise<ThreadItem[]> {
    const threads = await this.table.where('topicId').equals(topicId).reverse().sortBy('updatedAt');

    return threads.map((thread) => this.mapToThreadItem(thread));
  }

  async findById(id: string): Promise<DBModel<DB_Thread> | undefined> {
    return this.table.get(id);
  }

  async count(topicId?: string): Promise<number> {
    if (topicId) {
      return this.table.where('topicId').equals(topicId).count();
    }
    return this.table.count();
  }

  // **************** Create *************** //

  async create(params: CreateThreadParams, id = nanoid()): Promise<DBModel<DB_Thread>> {
    const threadData = {
      ...params,
      status: ThreadStatus.Active,
      type: params.type || ThreadType.Continuation,
    };

    await this._addWithSync(threadData, id);

    // 返回创建的记录
    const createdThread = await this.findById(id);
    if (!createdThread) {
      throw new Error('Failed to create thread');
    }

    return createdThread;
  }

  async batchCreate(threads: CreateThreadParams[]): Promise<DBModel<DB_Thread>[]> {
    const threadData = threads.map((thread) => ({
      ...thread,
      status: ThreadStatus.Active,
      type: thread.type || ThreadType.Continuation,
    }));

    const result = await this._batchAdd(threadData);

    if (!result.success) {
      throw new Error('Failed to batch create threads');
    }

    // 返回创建的记录
    const createdThreads = await Promise.all(result.ids.map((id) => this.findById(id)));

    return createdThreads.filter((thread): thread is DBModel<DB_Thread> => thread !== undefined);
  }

  // **************** Delete *************** //

  async delete(id: string): Promise<void> {
    await this._deleteWithSync(id);
  }

  async batchDelete(threadIds: string[]): Promise<void> {
    await this._bulkDeleteWithSync(threadIds);
  }

  async deleteByTopicId(topicId: string): Promise<void> {
    const threads = await this.table.where('topicId').equals(topicId).toArray();
    const threadIds = threads.map((thread) => thread.id);
    await this._bulkDeleteWithSync(threadIds);
  }

  async clearTable(): Promise<void> {
    await this._clearWithSync();
  }

  // **************** Update *************** //

  async update(id: string, data: Partial<DB_Thread>): Promise<void> {
    await this._updateWithSync(id, data);
  }

  async updateStatus(id: string, status: ThreadStatus): Promise<void> {
    await this.update(id, { status });
  }

  async updateTitle(id: string, title: string): Promise<void> {
    await this.update(id, { title });
  }

  async updateLastActiveAt(id: string): Promise<void> {
    await this.update(id, { lastActiveAt: Date.now() });
  }

  // **************** Helper *************** //

  private mapToThreadItem = (dbThread: DBModel<DB_Thread>): ThreadItem => ({
    id: dbThread.id,
    title: dbThread.title || '',
    type: dbThread.type as ThreadType,
    status: dbThread.status as ThreadStatus,
    topicId: dbThread.topicId,
    sourceMessageId: dbThread.sourceMessageId,
    parentThreadId: dbThread.parentThreadId,
    userId: dbThread.userId,
    lastActiveAt: new Date(dbThread.lastActiveAt || dbThread.updatedAt),
    createdAt: new Date(dbThread.createdAt),
    updatedAt: new Date(dbThread.updatedAt),
  });
}

export const ThreadModel = new _ThreadModel();

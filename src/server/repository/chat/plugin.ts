/**
 * Plugin Repository
 *
 * 聊天插件设置数据访问层
 */
import { db } from '@server/lib/db';
import { eq, inArray } from 'drizzle-orm';
import {
  chatPlugins,
  type ChatPlugin,
  type NewChatPlugin,
  type PluginManifest,
} from '@drizzle/schema/chat';
import { BaseRepository } from './base';

export type CreatePluginParams = Omit<NewChatPlugin, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePluginParams = Partial<
  Pick<NewChatPlugin, 'manifest' | 'settings'>
>;

export class PluginRepository extends BaseRepository<ChatPlugin> {
  constructor() {
    super(chatPlugins);
  }

  // ============== Query ==============

  /**
   * 获取所有插件
   */
  async findAll(): Promise<ChatPlugin[]> {
    return db.select().from(chatPlugins);
  }

  /**
   * 根据标识符获取插件
   */
  async findByIdentifier(identifier: string): Promise<ChatPlugin | undefined> {
    const results = await db
      .select()
      .from(chatPlugins)
      .where(eq(chatPlugins.identifier, identifier))
      .limit(1);

    return results[0];
  }

  /**
   * 根据类型获取插件
   */
  async findByType(type: 'plugin' | 'customPlugin'): Promise<ChatPlugin[]> {
    return db
      .select()
      .from(chatPlugins)
      .where(eq(chatPlugins.type, type));
  }

  /**
   * 检查标识符是否存在
   */
  async identifierExists(identifier: string): Promise<boolean> {
    const plugin = await this.findByIdentifier(identifier);
    return !!plugin;
  }

  // ============== Create ==============

  /**
   * 创建插件
   */
  async create(data: CreatePluginParams): Promise<string> {
    const result = await this._create({
      ...data,
      settings: data.settings ?? null,
    } as any);
    return result.id;
  }

  // ============== Update ==============

  /**
   * 更新插件
   */
  async update(id: string, data: UpdatePluginParams): Promise<boolean> {
    try {
      await db
        .update(chatPlugins)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(chatPlugins.id, id));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 更新插件清单
   */
  async updateManifest(id: string, manifest: Partial<PluginManifest>): Promise<boolean> {
    const plugin = await this._findById(id);
    if (!plugin || !plugin.manifest) return false;

    const newManifest = { ...(plugin.manifest as PluginManifest), ...manifest };
    return this.update(id, { manifest: newManifest });
  }

  /**
   * 更新插件设置
   */
  async updateSettings(id: string, settings: Record<string, unknown>): Promise<boolean> {
    const plugin = await this._findById(id);
    if (!plugin || !plugin.settings) return false;

    const newSettings = { ...(plugin.settings as Record<string, unknown>), ...settings };
    return this.update(id, { settings: newSettings });
  }

  // ============== Delete ==============

  /**
   * 删除插件
   */
  async delete(id: string): Promise<boolean> {
    return this._delete(id);
  }

  /**
   * 根据标识符删除插件
   */
  async deleteByIdentifier(identifier: string): Promise<boolean> {
    try {
      await db
        .delete(chatPlugins)
        .where(eq(chatPlugins.identifier, identifier));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 批量删除插件
   */
  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await db.delete(chatPlugins).where(inArray(chatPlugins.id, ids));

    return result.rowsAffected;
  }
}

// Export singleton instance
export const pluginRepository = new PluginRepository();
/**
 * Model Provider Repository
 *
 * 数据访问层：负责 model_providers 和 provider_models 表的数据库操作
 */
import { db } from '@server/lib/db';
import { modelProviders, providerModels } from '@/drizzle/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { BaseIntRepository } from './base';
import type { ModelProvider, ProviderModel } from '@/types/modelProvider';

/**
 * ModelProvider Repository
 * 管理模型服务商数据
 */
export class ModelProviderRepository extends BaseIntRepository<ModelProvider> {
  constructor() {
    super(modelProviders);
  }

  /**
   * 根据用户 ID 查找所有服务商
   */
  async findByUserId(userId: number): Promise<ModelProvider[]> {
    return this.findMany(eq(modelProviders.userId, userId), {
      orderBy: [asc(modelProviders.displayOrder), desc(modelProviders.createdAt)],
    });
  }

  /**
   * 根据用户 ID 和 slug 查找服务商
   */
  async findByUserIdAndSlug(userId: number, slug: string): Promise<ModelProvider | null> {
    return this.findOne(and(eq(modelProviders.userId, userId), eq(modelProviders.slug, slug))!);
  }

  /**
   * 检查 slug 是否已存在（用于唯一性验证）
   */
  async existsByUserIdAndSlug(userId: number, slug: string, excludeId?: number): Promise<boolean> {
    const conditions = excludeId
      ? and(eq(modelProviders.userId, userId), eq(modelProviders.slug, slug))
      : and(eq(modelProviders.userId, userId), eq(modelProviders.slug, slug));

    const result = await db
      .select({ id: modelProviders.id })
      .from(modelProviders)
      .where(conditions)
      .limit(1);

    if (excludeId && result.length > 0) {
      return result[0].id !== excludeId;
    }

    return result.length > 0;
  }

  /**
   * 查找用户的所有激活服务商
   */
  async findActiveByUserId(userId: number): Promise<ModelProvider[]> {
    return this.findMany(
      and(eq(modelProviders.userId, userId), eq(modelProviders.isActive, true)),
      {
        orderBy: [asc(modelProviders.displayOrder), desc(modelProviders.createdAt)],
      }
    );
  }

  /**
   * 切换服务商激活状态
   */
  async toggleActive(id: number, isActive: boolean): Promise<ModelProvider | null> {
    return this.update(id, { isActive });
  }

  /**
   * 验证服务商是否属于指定用户
   */
  async verifyOwnership(id: number, userId: number): Promise<boolean> {
    return this.exists(and(eq(modelProviders.id, id), eq(modelProviders.userId, userId))!);
  }
}

/**
 * ProviderModel Repository
 * 管理服务商模型数据
 */
export class ProviderModelRepository extends BaseIntRepository<ProviderModel> {
  constructor() {
    super(providerModels);
  }

  /**
   * 根据服务商 ID 查找所有模型
   */
  async findByProviderId(providerId: number): Promise<ProviderModel[]> {
    return this.findMany(eq(providerModels.providerId, providerId), {
      orderBy: [asc(providerModels.displayOrder), desc(providerModels.createdAt)],
    });
  }

  /**
   * 根据服务商 ID 和 slug 查找模型
   */
  async findByProviderIdAndSlug(providerId: number, slug: string): Promise<ProviderModel | null> {
    return this.findOne(
      and(eq(providerModels.providerId, providerId), eq(providerModels.slug, slug))!
    );
  }

  /**
   * 检查模型 slug 在服务商内是否已存在
   */
  async existsByProviderIdAndSlug(
    providerId: number,
    slug: string,
    excludeId?: number
  ): Promise<boolean> {
    const conditions = and(
      eq(providerModels.providerId, providerId),
      eq(providerModels.slug, slug)
    );

    const result = await db
      .select({ id: providerModels.id })
      .from(providerModels)
      .where(conditions)
      .limit(1);

    if (excludeId && result.length > 0) {
      return result[0].id !== excludeId;
    }

    return result.length > 0;
  }

  /**
   * 查找服务商的所有激活模型
   */
  async findActiveByProviderId(providerId: number): Promise<ProviderModel[]> {
    return this.findMany(
      and(eq(providerModels.providerId, providerId), eq(providerModels.isActive, true)),
      {
        orderBy: [asc(providerModels.displayOrder), desc(providerModels.createdAt)],
      }
    );
  }

  /**
   * 切换模型激活状态
   */
  async toggleActive(id: number, isActive: boolean): Promise<ProviderModel | null> {
    return this.update(id, { isActive });
  }

  /**
   * 批量删除服务商的所有模型（级联删除时使用）
   */
  async deleteByProviderId(providerId: number): Promise<void> {
    await this.deleteWhere(eq(providerModels.providerId, providerId));
  }
}

/**
 * Combined Model Provider Repository
 * 组合查询：涉及 provider 和 model 的联合操作
 */
export class ModelProviderCombinedRepository {
  /**
   * 获取用户的激活模型配置（带服务商信息）
   * @returns 模型及其所属服务商信息
   */
  async findActiveModelConfigByUserIdAndSlug(
    userId: number,
    modelSlug: string
  ): Promise<{ provider: ModelProvider; model: ProviderModel } | null> {
    const result = await db
      .select({
        provider: modelProviders,
        model: providerModels,
      })
      .from(providerModels)
      .innerJoin(modelProviders, eq(providerModels.providerId, modelProviders.id))
      .where(
        and(
          eq(modelProviders.userId, userId),
          eq(modelProviders.isActive, true),
          eq(providerModels.isActive, true),
          eq(providerModels.slug, modelSlug)
        )
      )
      .limit(1);

    return result.length > 0
      ? {
          provider: result[0].provider as ModelProvider,
          model: result[0].model as ProviderModel,
        }
      : null;
  }

  /**
   * 获取用户的所有可用模型（带服务商信息）
   */
  async findAllAvailableModelsByUserId(
    userId: number
  ): Promise<
    Array<ProviderModel & { providerName: string; providerSlug: string; providerBaseUrl: string }>
  > {
    const results = await db
      .select({
        id: providerModels.id,
        providerId: providerModels.providerId,
        slug: providerModels.slug,
        name: providerModels.name,
        contextWindow: providerModels.contextWindow,
        supportsVision: providerModels.supportsVision,
        supportsFunctionCalling: providerModels.supportsFunctionCalling,
        isActive: providerModels.isActive,
        displayOrder: providerModels.displayOrder,
        createdAt: providerModels.createdAt,
        updatedAt: providerModels.updatedAt,
        providerName: modelProviders.name,
        providerSlug: modelProviders.slug,
        providerBaseUrl: modelProviders.baseUrl,
      })
      .from(providerModels)
      .innerJoin(modelProviders, eq(providerModels.providerId, modelProviders.id))
      .where(
        and(
          eq(modelProviders.userId, userId),
          eq(modelProviders.isActive, true),
          eq(providerModels.isActive, true)
        )
      )
      .orderBy(asc(modelProviders.displayOrder), asc(providerModels.displayOrder));

    return results as Array<
      ProviderModel & { providerName: string; providerSlug: string; providerBaseUrl: string }
    >;
  }

  /**
   * 检查模型是否对用户可用
   */
  async isModelAvailableForUser(userId: number, modelSlug: string): Promise<boolean> {
    const result = await db
      .select({ id: providerModels.id })
      .from(providerModels)
      .innerJoin(modelProviders, eq(providerModels.providerId, modelProviders.id))
      .where(
        and(
          eq(modelProviders.userId, userId),
          eq(modelProviders.isActive, true),
          eq(providerModels.isActive, true),
          eq(providerModels.slug, modelSlug)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * 获取用户的默认模型 slug
   * 返回第一个激活服务商的第一个激活模型
   */
  async findDefaultModelSlugByUserId(userId: number): Promise<string | null> {
    const result = await db
      .select({ slug: providerModels.slug })
      .from(providerModels)
      .innerJoin(modelProviders, eq(providerModels.providerId, modelProviders.id))
      .where(
        and(
          eq(modelProviders.userId, userId),
          eq(modelProviders.isActive, true),
          eq(providerModels.isActive, true)
        )
      )
      .orderBy(asc(modelProviders.displayOrder), asc(providerModels.displayOrder))
      .limit(1);

    return result.length > 0 ? result[0].slug : null;
  }

  /**
   * 获取用户的默认模型完整配置
   * 返回第一个激活服务商的第一个激活模型的完整配置
   */
  async findDefaultModelConfigByUserId(
    userId: number
  ): Promise<{ provider: ModelProvider; model: ProviderModel } | null> {
    const result = await db
      .select({
        provider: modelProviders,
        model: providerModels,
      })
      .from(providerModels)
      .innerJoin(modelProviders, eq(providerModels.providerId, modelProviders.id))
      .where(
        and(
          eq(modelProviders.userId, userId),
          eq(modelProviders.isActive, true),
          eq(providerModels.isActive, true)
        )
      )
      .orderBy(asc(modelProviders.displayOrder), asc(providerModels.displayOrder))
      .limit(1);

    return result.length > 0
      ? {
          provider: result[0].provider as ModelProvider,
          model: result[0].model as ProviderModel,
        }
      : null;
  }

  /**
   * 验证模型是否属于用户（通过服务商关联）
   */
  async verifyModelOwnership(modelId: number, userId: number): Promise<boolean> {
    const result = await db
      .select({ id: providerModels.id })
      .from(providerModels)
      .innerJoin(modelProviders, eq(providerModels.providerId, modelProviders.id))
      .where(and(eq(providerModels.id, modelId), eq(modelProviders.userId, userId)))
      .limit(1);

    return result.length > 0;
  }
}

// 导出单例实例
export const modelProviderRepository = new ModelProviderRepository();
export const providerModelRepository = new ProviderModelRepository();
export const modelProviderCombinedRepository = new ModelProviderCombinedRepository();

/**
 * ID生成器类
 * 用于生成类似"DwWvS"结构的唯一ID
 */
export class IdGenerator {
  private usedIds: Set<string> = new Set();
  private readonly characters: string =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  private readonly idLength: number = 5;

  /**
   * 构造函数，可以传入已存在的ID数组
   * @param existingIds 已存在的ID数组
   */
  constructor(existingIds: string[] = []) {
    if (existingIds.length > 0) {
      existingIds.forEach((id) => this.usedIds.add(id));
    }
  }

  /**
   * 生成唯一ID
   */
  public generateId(): string {
    let id: string;
    do {
      id = this.createRandomId();
    } while (this.usedIds.has(id));

    this.usedIds.add(id);
    return id;
  }

  /**
   * 检查ID是否已存在
   */
  public isIdUsed(id: string): boolean {
    return this.usedIds.has(id);
  }

  /**
   * 重置ID生成器状态
   * @param existingIds 重置后需要保留的ID数组
   */
  public reset(existingIds: string[] = []): void {
    this.usedIds.clear();

    if (existingIds.length > 0) {
      existingIds.forEach((id) => this.usedIds.add(id));
    }
  }

  /**
   * 自定义ID长度
   */
  public setIdLength(length: number): void {
    if (length < 1) throw new Error('ID长度必须大于0');
  }

  /**
   * 创建随机ID
   */
  private createRandomId(): string {
    let result = '';
    const charactersLength = this.characters.length;

    for (let i = 0; i < this.idLength; i++) {
      result += this.characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  }

  /**
   * 添加一组已存在的ID
   * @param ids 需要添加的ID数组
   */
  public addExistingIds(ids: string[]): void {
    ids.forEach((id) => this.usedIds.add(id));
  }
}

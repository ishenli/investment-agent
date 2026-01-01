// 编一个 Graph 的抽象类，主要是适配 langgraph 的调用，保证所有的子类能否实现相关的方法

export abstract class AbstractGraph {
  abstract setup(): Promise<void>;
}

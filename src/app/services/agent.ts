class AgentService {
  createAgentKnowledgeBase = async (
    agentId: string,
    knowledgeBaseId: string,
    enabled?: boolean,
  ) => {
    // Mock 实现：创建代理知识库关联
    return {
      success: true,
      data: {
        agentId,
        knowledgeBaseId,
        enabled: enabled ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  };

  deleteAgentKnowledgeBase = async (agentId: string, knowledgeBaseId: string) => {
    // Mock 实现：删除代理知识库关联
    return {
      success: true,
      message: `已删除代理 ${agentId} 的知识库 ${knowledgeBaseId}`,
    };
  };

  toggleKnowledgeBase = async (agentId: string, knowledgeBaseId: string, enabled?: boolean) => {
    // Mock 实现：切换知识库启用状态
    return {
      success: true,
      data: {
        agentId,
        knowledgeBaseId,
        enabled: enabled ?? true,
        updatedAt: new Date().toISOString(),
      },
    };
  };

  createAgentFiles = async (agentId: string, fileIds: string[], enabled?: boolean) => {
    // Mock 实现：创建代理文件关联
    const fileAssociations = fileIds.map((fileId) => ({
      agentId,
      fileId,
      enabled: enabled ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    return {
      success: true,
      data: fileAssociations,
    };
  };

  deleteAgentFile = async (agentId: string, fileId: string) => {
    // Mock 实现：删除代理文件关联
    return {
      success: true,
      message: `已删除代理 ${agentId} 的文件 ${fileId}`,
    };
  };

  toggleFile = async (agentId: string, fileId: string, enabled?: boolean) => {
    // Mock 实现：切换文件启用状态
    return {
      success: true,
      data: {
        agentId,
        fileId,
        enabled: enabled ?? true,
        updatedAt: new Date().toISOString(),
      },
    };
  };

  getFilesAndKnowledgeBases = async (agentId: string) => {
    // Mock 实现：获取代理的文件和知识库列表
    return {
      success: true,
      data: {
        agentId,
        knowledgeBases: [
          {
            id: 'kb-001',
            name: '产品文档知识库',
            description: '包含产品功能和使用说明的文档',
            enabled: true,
            fileCount: 15,
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-20T14:30:00Z',
          },
          {
            id: 'kb-002',
            name: '技术文档知识库',
            description: '技术实现和架构相关文档',
            enabled: false,
            fileCount: 8,
            createdAt: '2024-01-10T09:00:00Z',
            updatedAt: '2024-01-18T16:45:00Z',
          },
          {
            id: 'kb-003',
            name: '用户手册知识库',
            description: '用户操作指南和常见问题',
            enabled: true,
            fileCount: 12,
            createdAt: '2024-01-12T11:00:00Z',
            updatedAt: '2024-01-22T13:20:00Z',
          },
        ],
        files: [
          {
            id: 'file-001',
            name: '产品介绍.pdf',
            type: 'pdf',
            size: 2048576,
            enabled: true,
            uploadedAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-20T14:30:00Z',
          },
          {
            id: 'file-002',
            name: '技术架构图.png',
            type: 'image',
            size: 512000,
            enabled: true,
            uploadedAt: '2024-01-10T09:00:00Z',
            updatedAt: '2024-01-18T16:45:00Z',
          },
          {
            id: 'file-003',
            name: '用户操作手册.docx',
            type: 'document',
            size: 1536000,
            enabled: false,
            uploadedAt: '2024-01-12T11:00:00Z',
            updatedAt: '2024-01-22T13:20:00Z',
          },
          {
            id: 'file-004',
            name: 'API 接口文档.md',
            type: 'markdown',
            size: 256000,
            enabled: true,
            uploadedAt: '2024-01-16T15:00:00Z',
            updatedAt: '2024-01-21T10:15:00Z',
          },
          {
            id: 'file-005',
            name: '部署指南.txt',
            type: 'text',
            size: 128000,
            enabled: true,
            uploadedAt: '2024-01-14T08:00:00Z',
            updatedAt: '2024-01-19T17:30:00Z',
          },
        ],
        statistics: {
          totalKnowledgeBases: 3,
          enabledKnowledgeBases: 2,
          totalFiles: 5,
          enabledFiles: 4,
          totalSize: 4486656, // 字节
        },
      },
    };
  };
}

export const agentService = new AgentService();

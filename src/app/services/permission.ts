/**
 * Permission Request Service
 * 
 * 处理 Claude SDK 的权限请求响应
 */

export interface PermissionRequestData {
  permissionRequestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  decisionReason?: string;
  blockedPath?: string;
  description?: string;
}

export interface PermissionDecision {
  permissionRequestId: string;
  decision: {
    behavior: 'allow' | 'deny';
    updatedInput?: Record<string, unknown>;
    message?: string;
  };
}

/**
 * 发送权限响应到后端
 */
export async function respondToPermissionRequest(
  decision: PermissionDecision
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/chat/permission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decision),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to respond to permission request',
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 批准权限请求
 */
export async function approvePermission(
  permissionRequestId: string,
  updatedInput?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  return respondToPermissionRequest({
    permissionRequestId,
    decision: {
      behavior: 'allow',
      updatedInput,
    },
  });
}

/**
 * 拒绝权限请求
 */
export async function denyPermission(
  permissionRequestId: string,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  return respondToPermissionRequest({
    permissionRequestId,
    decision: {
      behavior: 'deny',
      message,
    },
  });
}

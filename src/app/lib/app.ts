export async function initAppData() {
  try {
    // 在 ssr 阶段的请求，使用完整的 URL
    await fetch(`${process.env.BACKEND_URL || ''}/api/init`);
  } catch (error) {
    console.error('初始化请求失败:', error);
  }
}

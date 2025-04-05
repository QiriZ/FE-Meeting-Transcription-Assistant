/**
 * 会议转写小助手 API 服务
 * 负责与DeepSeek-R1 API通信
 */

// DeepSeek API配置
const API_CONFIG = {
  baseUrl: 'https://api.siliconflow.cn/v1/chat/completions',
  modelName: 'Pro/deepseek-ai/DeepSeek-R1',
  maxTokens: 4000, // 设置足够大的token数以处理较长文本
  temperature: 0.3, // 较低的temperature使输出更确定性
}

/**
 * 调用DeepSeek API进行文本处理
 * @param {string} inputText - 用户输入的原始文本
 * @param {string} mode - 处理模式(interview|outline|speech)
 * @param {string} apiKey - DeepSeek API密钥
 * @param {Object} options - 其他选项，如是否标准化术语等
 * @returns {Promise} - 返回处理结果
 */
async function processWithDeepSeek(inputText, mode, apiKey, options = {}) {
  // 从prompts.js获取对应模式的提示词
  const systemPrompt = getPrompt(mode);
  
  // 构建API请求体
  const requestBody = {
    model: API_CONFIG.modelName,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: inputText
      }
    ],
    stream: false,
    max_tokens: API_CONFIG.maxTokens,
    temperature: options.creative ? 0.7 : API_CONFIG.temperature, // 如果需要创意性，提高温度
    top_p: 0.7,
    response_format: {
      type: "text"
    }
  };
  
  try {
    // 发送API请求
    const response = await fetch(API_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // 处理API响应
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API请求失败:', errorData);
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 提取处理结果文本
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return {
        content: data.choices[0].message.content,
        usage: data.usage,
        success: true
      };
    } else {
      throw new Error('API返回结果格式不正确');
    }
  } catch (error) {
    console.error('处理文本时出错:', error);
    return {
      success: false,
      error: error.message || '未知错误'
    };
  }
}

/**
 * 验证API密钥是否有效
 * @param {string} apiKey - DeepSeek API密钥
 * @returns {Promise<boolean>} - 返回密钥是否有效
 */
async function validateApiKey(apiKey) {
  if (!apiKey || apiKey.trim() === '') {
    return false;
  }
  
  try {
    const response = await fetch(API_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: API_CONFIG.modelName,
        messages: [
          {
            role: "user",
            content: "测试API密钥是否有效"
          }
        ],
        max_tokens: 10 // 只生成少量token以验证密钥
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('验证API密钥时出错:', error);
    return false;
  }
}

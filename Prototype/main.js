// 系统提示配置
const SYSTEM_PROMPTS = {
    interview: `采访稿模式处理要求：
- 使用Q&A格式，优化问题表述
- 尽可能保留回答原文，只去除口水话
- 保持回答的专业性
- 问题使用## Q: 格式，答案使用## A: 格式`,

    speechOutline: `演讲提纲模式处理要求：
- 构建金字塔结构，提取核心观点和关键内容
- 添加演讲节奏标记，如起承转合
- 使用大纲形式，主标题使用# ，一级标题使用## ，二级标题使用### 
- 在要点后添加时间戳引用，格式如[10:15]
- 使用适当的列表格式组织内容`,

    speech: `演讲稿模式处理要求：
- 使用分段描述模式，一个话题/观点一个段落，不需要对每个观点做总结，就直接一个段落输出就好。
- 尽可能保持原文语气，只去除口水话，长度也和原文一致，一段一段的话，还原度要高
- 保持专业性和名词的一致性
- 使用## 标记段落主题
- 段落之间用空行分隔
- 检查段落中间不要出现突然的【发言人】[10:09] 标记，在演讲稿模式不输出发言人和时间戳标记。`
};

// DOM 元素引用
const elements = {
    // 模式切换按钮
    modeButtons: {
        interview: document.getElementById('interview-mode'),
        outline: document.getElementById('outline-mode'),
        speech: document.getElementById('speech-mode')
    },
    // 文件上传区域
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    // 文本区域
    inputText: document.getElementById('input-text'),
    // 处理选项
    options: {
        termStandardize: document.getElementById('term-standardize'),
        emotionKeep: document.getElementById('emotion-keep'),
        autoParagraph: document.getElementById('auto-paragraph')
    },
    // 处理按钮
    processBtn: document.getElementById('process-btn'),
    // 结果区域
    tabButtons: document.querySelectorAll('.tab-btn'),
    originalPanel: document.getElementById('original-panel'),
    processedPanel: document.getElementById('processed-panel'),
    originalContent: document.getElementById('original-content'),
    processedContent: document.getElementById('processed-content'),
    // 结果区按钮
    copyBtn: document.getElementById('copy-btn'),
    exportBtn: document.getElementById('export-btn'),
    // API 配置
    configBtn: document.getElementById('config-btn'),
    apiConfigModal: document.getElementById('api-config-modal'),
    closeModalBtn: document.getElementById('close-modal'),
    apiKeyInput: document.getElementById('api-key'),
    saveApiKeyBtn: document.getElementById('save-api-key')
};

// 当前状态
const state = {
    currentMode: 'interview', // 默认采访稿模式
    isProcessing: false,
    apiKey: localStorage.getItem('deepseek_api_key') || 'sk-qcpqszdsbeaorqannddefogbfmltdtvkiwtqzgtbuqblgyoo', // 默认使用提供的API Key
    originalText: '',
    processedText: '',
    options: {
        termStandardize: true,
        emotionKeep: true,
        autoParagraph: true,
        creative: false
    }
};

// 初始化应用
function initApp() {
    // 加载 API 密钥
    if (state.apiKey) {
        elements.apiKeyInput.value = state.apiKey;
    }

    // 设置事件监听器
    setupEventListeners();
    
    // 检查 API 密钥
    if (!state.apiKey) {
        showModal();
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 模式切换
    Object.entries(elements.modeButtons).forEach(([mode, button]) => {
        button.addEventListener('click', () => switchMode(mode));
    });
    
    // 文件上传区域事件
    elements.dropzone.addEventListener('click', () => elements.fileInput.click());
    elements.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropzone.classList.add('active');
    });
    elements.dropzone.addEventListener('dragleave', () => {
        elements.dropzone.classList.remove('active');
    });
    elements.dropzone.addEventListener('drop', handleFileDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // 文本输入实时监听
    elements.inputText.addEventListener('input', function() {
        state.originalText = this.value;
        updateOriginalPanel();
    });
    
    // 文本粘贴事件
    elements.inputText.addEventListener('paste', function() {
        // 使用setTimeout确保粘贴内容已被填充到输入框
        setTimeout(() => {
            state.originalText = this.value;
            updateOriginalPanel();
        }, 10);
    });
    
    // 处理按钮事件
    elements.processBtn.addEventListener('click', processText);
    
    // 复制和导出按钮事件
    elements.copyBtn.addEventListener('click', copyResult);
    elements.exportBtn.addEventListener('click', exportResult);
    
    // API 配置事件
    elements.configBtn.addEventListener('click', showModal);
    elements.closeModalBtn.addEventListener('click', hideModal);
    elements.saveApiKeyBtn.addEventListener('click', saveApiKey);
}

// 切换模式
function switchMode(mode) {
    state.currentMode = mode;
    
    // 更新按钮状态
    Object.entries(elements.modeButtons).forEach(([key, button]) => {
        if (key === mode) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    console.log(`已切换到${getModeName(mode)}模式`);
}

// 获取模式名称
function getModeName(mode) {
    const modeNames = {
        'interview': '采访稿',
        'outline': '演讲提纲',
        'speech': '演讲稿'
    };
    return modeNames[mode];
}

// 处理文件拖拽
function handleFileDrop(e) {
    e.preventDefault();
    elements.dropzone.classList.remove('active');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        readFile(files[0]);
    }
}

// 处理文件选择
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        readFile(files[0]);
    }
}

// 读取文件内容
function readFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        elements.inputText.value = e.target.result;
        state.originalText = e.target.result;
        updateOriginalPanel();
    };
    
    reader.readAsText(file);
}

// 更新原始面板内容
function updateOriginalPanel() {
    if (!state.originalText.trim()) {
        elements.originalContent.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><p>请在上方输入框中输入或粘贴内容</p></div>';
        return;
    }
    
    let content = '';
    
    // 解析带有时间戳和发言人的文本
    const paragraphs = state.originalText.split(/\n\s*\n/).filter(p => p.trim());
    let currentSpeaker = '';
    let currentTimestamp = '';
    let currentTexts = [];
    
    // 首先尝试检测是否有“说话人 X XX:XX”的格式
    paragraphs.forEach(paragraph => {
        // 检测是否是新的发言人段落
        const speakerMatch = paragraph.match(/^\s*(说话人\s*\d+)\s+(\d{2}:\d{2})\s*[\r\n]*(.*)$/s);
        
        if (speakerMatch) {
            // 如果有之前的内容，先生成前一个发言人的气泡
            if (currentSpeaker && currentTexts.length > 0) {
                content += generateSpeechBubble(currentSpeaker, currentTimestamp, currentTexts.join('\n'));
            }
            
            // 设置新的当前发言人和时间戳
            currentSpeaker = speakerMatch[1];
            currentTimestamp = speakerMatch[2];
            currentTexts = [speakerMatch[3]];
        } else {
            // 检测是否是同一个发言人的新时间戳
            const continuationMatch = paragraph.match(/^\s*(\d{2}:\d{2})\s*[\r\n]*(.*)$/s);
            
            if (continuationMatch && currentSpeaker) {
                // 生成前一个时间戳的气泡
                content += generateSpeechBubble(currentSpeaker, currentTimestamp, currentTexts.join('\n'));
                
                // 更新时间戳和内容
                currentTimestamp = continuationMatch[1];
                currentTexts = [continuationMatch[2]];
            } else if (currentSpeaker) {
                // 同一发言人的继续内容
                currentTexts.push(paragraph);
            } else {
                // 没有发言人信息，直接显示文本
                content += `<div class="speech-bubble"><div class="content">${paragraph}</div></div>`;
            }
        }
    });
    
    // 处理最后一个发言人的内容
    if (currentSpeaker && currentTexts.length > 0) {
        content += generateSpeechBubble(currentSpeaker, currentTimestamp, currentTexts.join('\n'));
    }
    
    // 如果没有检测到结构化格式，尝试简单按行分割
    if (!content) {
        const lines = state.originalText.split('\n');
        
        lines.forEach(line => {
            if (line.trim() === '') return;
            
            const speakerMatch = line.match(/^\s*(.+?)\s+(\d{2}:\d{2})\s+(.+)$/);
            
            if (speakerMatch) {
                const speaker = speakerMatch[1];
                const timestamp = speakerMatch[2];
                const text = speakerMatch[3];
                
                content += generateSpeechBubble(speaker, timestamp, text);
            } else {
                content += `<div class="speech-bubble"><div class="content">${line}</div></div>`;
            }
        });
    }
    
    elements.originalContent.innerHTML = content || '<div class="no-content">无法识别文本格式，请确保包含发言人和时间戳</div>';
}

// 生成说话气泡的HTML
function generateSpeechBubble(speaker, timestamp, content) {
    return `
        <div class="speech-bubble">
            <div class="speaker">${speaker}</div>
            <div class="timestamp">${timestamp}</div>
            <div class="content">${content}</div>
        </div>
    `;
}

// 处理文本
async function processText() {
    state.originalText = elements.inputText.value;
    
    if (!state.originalText) {
        alert('请先输入或上传文本');
        return;
    }
    
    if (!state.apiKey) {
        alert('请先配置 DeepSeek API Key');
        showModal();
        return;
    }
    
    // 更新原始面板内容
    updateOriginalPanel();
    
    // 显示处理中状态
    elements.processedContent.innerHTML = `
        <div class="processing-state">
            <i class="fas fa-circle-notch fa-spin"></i>
            <p>正在调用 DeepSeek API 处理文本，请稍候...</p>
            <p class="small-text">解析长度为 ${state.originalText.length} 字符的文本，大约需要 1-2 分钟</p>
        </div>
    `;
    
    state.isProcessing = true;
    elements.processBtn.disabled = true;
    elements.processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
    
    // 收集处理选项
    const options = {
        termStandardize: elements.options.termStandardize.checked,
        emotionKeep: elements.options.emotionKeep.checked,
        autoParagraph: elements.options.autoParagraph.checked,
        creative: false
    };
    
    try {
        // 检查是否在开发模式(本地调试)
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        let result;
        if (isDevelopment && false) { // 当需要模拟时改为true
            // 模拟 API 响应（开发模式）
            await new Promise(resolve => setTimeout(resolve, 2000));
            result = simulateApiResponse();
        } else {
            // 调用真实API
            result = await processWithDeepSeek(
                state.originalText,
                state.currentMode,
                state.apiKey,
                options
            );
        }
        
        if (result.success) {
            // 处理成功，显示结果
            state.processedText = result.content;
            renderMarkdown(result.content);
            
            // 显示用量统计（如果有）
            if (result.usage) {
                console.log('处理完成，用量统计:', result.usage);
            }
        } else {
            // 处理失败，显示错误
            showApiError(result.error || 'API调用失败');
        }
    } catch (error) {
        console.error('处理文本时出错:', error);
        showApiError(error.message || '未知错误');
    } finally {
        state.isProcessing = false;
        elements.processBtn.disabled = false;
        elements.processBtn.innerHTML = '<i class="fas fa-magic"></i> 开始处理';
    }
}

// 显示 API 错误
function showApiError(errorMessage = 'Failed to fetch') {
    elements.processedContent.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>处理请求出错: ${errorMessage}</p>
            <button class="retry-btn" onclick="processText()">重试</button>
        </div>
    `;
}

// 渲染Markdown文本
function renderMarkdown(markdownText) {
    if (!markdownText) {
        elements.processedContent.innerHTML = '<div class="empty-state"><i class="fas fa-file-code"></i><p>无处理结果</p></div>';
        return;
    }
    
    try {
        // 使用marked库将Markdown转换为HTML
        const htmlContent = marked.parse(markdownText);
        
        // 显示渲染结果
        elements.processedContent.innerHTML = `<div class="markdown-content">${htmlContent}</div>`;
        
        // 高亮代码块（如果有）
        document.querySelectorAll('.markdown-content pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    } catch (error) {
        console.error('Markdown渲染错误:', error);
        elements.processedContent.innerHTML = `
            <div class="error-state">
                <i class="fas fa-file-code"></i>
                <p>处理结果渲染错误</p>
                <pre>${markdownText}</pre>
            </div>
        `;
    }
}

// 模拟 API 响应
function simulateApiResponse() {
    const mode = state.currentMode;
    const options = {
        termStandard: elements.options.termStandardize.checked,
        emotionKeep: elements.options.emotionKeep.checked,
        autoParagraph: elements.options.autoParagraph.checked
    };
    
    // 模拟不同模式下的处理结果
    let content = '';
    
    if (mode === 'interview') {
        content = `## Q: 能否解释一下 GPU 编程在传输领域的应用？

## A: 英伟达文章扩展了 GPU 的编程细节，这些内容可以应用于传输领域。这一领域还有一些先进技术，比如 VLM 实现了分层建模，利用生成的部分结果将图片预测分为多个阶段设计，有效减少了内存占用。此外，还有 pipeline 等其他创新技术方案。`;
    } else if (mode === 'outline') {
        content = `# GPU 技术应用

## 1. 英伟达 GPU 编程技术 [16:31]
- 扩展了传统 GPU 编程细节
- 可应用于数据传输领域

## 2. 黑科技工作案例 [16:31]
- VLM 分层建模技术
  - 利用部分生成结果
  - 将图片处理分多阶段设计
  - 有效减少内存占用

## 3. 其他创新技术 [16:31]
- Pipeline 技术方案
- 其他内存优化黑科技`;
    } else {
        content = `## GPU 在传输领域的技术创新

英伟达的研究扩展了 GPU 编程的细节，这些技术可以应用到数据传输领域。在这一方向上也出现了一些创新技术，比如 VLM 技术实现了分层建模，通过利用已生成的部分结果，将图片预测分为多个处理阶段，有效减少了内存占用。

除此之外，还有 pipeline 等其他一些创新技术方案，这些技术都在不同程度上提高了数据处理效率。`;
    }
    
    // 模拟了真实API返回格式
    return {
        success: true,
        content: content,
        usage: {
            prompt_tokens: 120,
            completion_tokens: 145,
            total_tokens: 265
        }
    };
}

// 复制结果
function copyResult() {
    if (!state.processedText) {
        alert('暂无处理结果可复制');
        return;
    }
    
    // 创建一个临时textarea元素来实现复制
    const textarea = document.createElement('textarea');
    textarea.value = state.processedText;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        // 执行复制命令
        const successful = document.execCommand('copy');
        if (successful) {
            showSuccessMessage('复制成功！');
        } else {
            console.error('复制失败');
            // 如果执行复制失败，尝试使用Clipboard API
            navigator.clipboard.writeText(state.processedText)
                .then(() => showSuccessMessage('复制成功！'))
                .catch(err => console.error('使用Clipboard API复制失败:', err));
        }
    } catch (err) {
        console.error('复制过程中出错:', err);
        // 尝试使用现代API
        navigator.clipboard.writeText(state.processedText)
            .then(() => showSuccessMessage('复制成功！'))
            .catch(err => {
                console.error('使用Clipboard API复制失败:', err);
                alert('复制失败，请手动选择结果复制');
            });
    } finally {
        // 清理临时元素
        document.body.removeChild(textarea);
    }
}

// 显示成功消息
function showSuccessMessage(message) {
    // 检查是否已存在消息元素
    let messageEl = document.querySelector('.success-message');
    
    if (!messageEl) {
        // 创建消息元素
        messageEl = document.createElement('div');
        messageEl.className = 'success-message';
        document.body.appendChild(messageEl);
    }
    
    // 设置消息内容
    messageEl.textContent = message;
    messageEl.style.opacity = '1';
    
    // 2秒后消失
    setTimeout(() => {
        messageEl.style.opacity = '0';
    }, 2000);
}

// 获取格式化日期
function getFormattedDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}_${hour}${minute}`;
}

// 导出结果为Markdown文件
function exportResult() {
    if (!state.processedText) {
        alert('暂无处理结果可导出');
        return;
    }
    
    // 生成文件名称，格式为: 会议转写_模式_日期.md
    const timestamp = getFormattedDate();
    const modeName = getModeName(state.currentMode);
    const filename = `会议转写_${modeName}_${timestamp}.md`;
    
    // 创建一个下载链接
    const blob = new Blob([state.processedText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // 配置下载属性
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    
    // 触发下载
    a.click();
    
    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccessMessage('导出成功！');
    }, 100);
}

// 云端保存
function cloudSave() {
    if (!state.processedText) {
        alert('暂无处理结果可保存');
        return;
    }
    
    showSuccessMessage('云端保存功能开发中，请先使用导出功能保存到本地');
}

// 显示 API 配置模态框
function showModal() {
    elements.apiConfigModal.style.display = 'flex';
}

// 隐藏 API 配置模态框
function hideModal() {
    elements.apiConfigModal.style.display = 'none';
}

// 保存 API 密钥
function saveApiKey() {
    const apiKey = elements.apiKeyInput.value.trim();
    
    if (!apiKey) {
        alert('请输入有效的 DeepSeek API Key');
        return;
    }
    
    // 存储到本地
    localStorage.setItem('deepseek_api_key', apiKey);
    state.apiKey = apiKey;
    
    hideModal();
    alert('API 配置已保存');
}

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp);

document.addEventListener('DOMContentLoaded', () => {
    // --- Global State ---
    let activeConversationId = null;
    let currentStreamController = null; // AbortController for active stream
    let attachedFile = null;            // Currently loaded text file contents
    
    // --- DOM Elements ---
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const themeToggle = document.getElementById('theme-toggle');
    const themeText = document.getElementById('theme-text');
    const newChatBtn = document.getElementById('new-chat-btn');
    const searchInput = document.getElementById('search-input');
    const conversationsList = document.getElementById('conversations-list');
    
    const dropdown = document.getElementById('model-dropdown');
    const dropdownTrigger = document.getElementById('dropdown-trigger');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const selectedProviderBadge = document.getElementById('selected-provider-badge');
    const selectedModelName = document.getElementById('selected-model-name');
    const selectedModelIdInput = document.getElementById('selected-model-id');
    const modelIndicatorFooter = document.getElementById('model-indicator-footer');
    
    const customModelContainer = document.getElementById('custom-model-container');
    const customModelInput = document.getElementById('custom-model-input');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    
    const messagesContainer = document.getElementById('messages-container');
    const emptyState = document.getElementById('empty-state');
    const chatThread = document.getElementById('chat-thread');
    
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const fileInput = document.getElementById('file-input');
    const attachBtn = document.getElementById('attach-btn');
    const attachedFilesContainer = document.getElementById('attached-files-container');
    const attachedFileName = document.getElementById('attached-file-name');
    const removeFileBtn = document.getElementById('remove-file-btn');

    // --- HTML Escaper ---
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // --- Markdown Parser & Syntax Highlight Setup ---
    const renderer = new marked.Renderer();
    renderer.code = function(code, infostring, escaped) {
        const lang = (infostring || '').match(/\S*/)[0];
        let highlighted;
        if (lang && hljs.getLanguage(lang)) {
            try {
                highlighted = hljs.highlight(code, { language: lang }).value;
            } catch (e) {
                highlighted = escapeHtml(code);
            }
        } else {
            highlighted = escapeHtml(code);
        }
        
        return `
            <div class="code-block-wrapper">
                <div class="code-block-header">
                    <span class="code-block-lang">${lang || 'text'}</span>
                    <button class="copy-code-btn" onclick="copyCode(this)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <span>Copy</span>
                    </button>
                </div>
                <pre><code class="hljs language-${lang || 'text'}">${highlighted}</code></pre>
            </div>
        `;
    };
    marked.use({ renderer });

    // Global copy code utility
    window.copyCode = function(button) {
        const wrapper = button.closest('.code-block-wrapper');
        const codeEl = wrapper.querySelector('pre code');
        const textToCopy = codeEl.textContent;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const span = button.querySelector('span');
            const originalText = span.textContent;
            span.textContent = 'Copied!';
            button.style.color = 'var(--accent-color)';
            
            setTimeout(() => {
                span.textContent = originalText;
                button.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    // Make suggestion cards clickable
    window.fillInput = function(text) {
        chatInput.value = text;
        chatInput.focus();
        adjustInputHeight();
        toggleSendButton();
    };

    // --- Init Function ---
    function init() {
        setupTheme();
        loadModels();
        loadConversations();
        setupEventListeners();
        adjustInputHeight();
    }

    // --- Theme Manager ---
    function setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeUI(savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeUI(newTheme);
    }

    function updateThemeUI(theme) {
        if (theme === 'dark') {
            themeText.textContent = 'Light mode';
        } else {
            themeText.textContent = 'Dark mode';
        }
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        // Theme toggle
        themeToggle.addEventListener('click', toggleTheme);

        // Sidebar mobile expand/collapse
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });

        // Close sidebar if clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target) && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });

        // Dropdown toggle
        dropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.remove('open');
        });

        // Input autosize
        chatInput.addEventListener('input', () => {
            adjustInputHeight();
            toggleSendButton();
        });

        // Handle enter key to send
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) {
                    handleSendMessage();
                }
            }
        });

        // Keyboard Shortcut: Ctrl+K or Ctrl+J to New Chat
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                startNewChat();
            }
        });

        // Send/Stop button click
        sendBtn.addEventListener('click', () => {
            if (currentStreamController) {
                // Abort active stream
                currentStreamController.abort();
                stopStreamingState();
            } else {
                handleSendMessage();
            }
        });

        // New Chat Button
        newChatBtn.addEventListener('click', startNewChat);

        // Clear Chat Button
        clearChatBtn.addEventListener('click', () => {
            if (activeConversationId) {
                if (confirm("Are you sure you want to clear this chat history?")) {
                    deleteConversationMessages(activeConversationId);
                }
            } else {
                chatThread.innerHTML = '';
                showEmptyState(true);
            }
        });

        // Search Input Filter
        searchInput.addEventListener('input', filterConversations);

        // File upload actions
        attachBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileUpload);
        removeFileBtn.addEventListener('click', removeAttachment);
    }

    // --- Sidebar Conversations Operations ---
    async function loadConversations() {
        try {
            const res = await fetch('/api/conversations');
            const data = await res.json();
            
            conversationsList.innerHTML = '';
            if (data.length === 0) {
                conversationsList.innerHTML = '<div class="input-info">No conversations yet</div>';
                return;
            }
            
            data.forEach(conv => {
                const item = document.createElement('div');
                item.className = `conversation-item ${conv.id === activeConversationId ? 'active' : ''}`;
                item.setAttribute('data-id', conv.id);
                
                item.innerHTML = `
                    <div class="conv-title-wrapper" onclick="selectConversation('${conv.id}')">
                        <svg class="conv-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        <span class="conv-title">${escapeHtml(conv.title)}</span>
                    </div>
                    <div class="conv-actions">
                        <button class="conv-action-btn edit-btn" title="Rename conversation">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="conv-action-btn delete-btn" title="Delete conversation">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                `;
                
                // Add event listeners for edit and delete inside item
                item.querySelector('.delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                });
                item.querySelector('.edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    renameConversation(conv.id, conv.title);
                });
                
                conversationsList.appendChild(item);
            });
        } catch (e) {
            console.error("Error loading conversations", e);
        }
    }

    window.selectConversation = async function(id) {
        if (currentStreamController) {
            currentStreamController.abort();
            stopStreamingState();
        }
        
        activeConversationId = id;
        
        // Highlight active item
        document.querySelectorAll('.conversation-item').forEach(item => {
            if (item.getAttribute('data-id') === id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        showEmptyState(false);
        chatThread.innerHTML = '<div class="input-info">Loading messages...</div>';
        
        try {
            const res = await fetch(`/api/conversations/${id}`);
            const data = await res.json();
            
            chatThread.innerHTML = '';
            
            // Set model selector to match conversation
            const modelId = data.conversation.model_id;
            selectModel(modelId, false); // select it, don't trigger dynamic inputs
            
            if (data.messages.length === 0) {
                showEmptyState(true);
            } else {
                data.messages.forEach(msg => {
                    appendMessageBubble(msg.role, msg.content, msg.id, false);
                });
                scrollToBottom();
            }
        } catch (e) {
            chatThread.innerHTML = `<div class="input-info" style="color: var(--accent-color)">Error loading conversation messages: ${e.message}</div>`;
        }
        
        // Close sidebar on mobile after clicking
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    };

    async function deleteConversation(id) {
        if (!confirm("Are you sure you want to delete this conversation?")) return;
        
        try {
            const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            if (res.ok) {
                if (activeConversationId === id) {
                    activeConversationId = null;
                    chatThread.innerHTML = '';
                    showEmptyState(true);
                }
                loadConversations();
            }
        } catch (e) {
            console.error("Failed to delete conversation", e);
        }
    }

    async function renameConversation(id, currentTitle) {
        const newTitle = prompt("Enter new title for this conversation:", currentTitle);
        if (!newTitle || newTitle.trim() === "" || newTitle === currentTitle) return;
        
        try {
            const res = await fetch(`/api/conversations/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle.trim() })
            });
            if (res.ok) {
                loadConversations();
            }
        } catch (e) {
            console.error("Failed to rename conversation", e);
        }
    }

    async function deleteConversationMessages(id) {
        // Custom endpoint, or we can just send custom delete to reset
        // To clear history, we delete the conversation and create a new one with same model
        try {
            const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            if (res.ok) {
                // Re-create conversation with same model to keep clean page state
                const modelId = selectedModelIdInput.value;
                const newRes = await fetch('/api/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model_id: modelId, title: "New Chat" })
                });
                const newConv = await newRes.json();
                activeConversationId = newConv.id;
                chatThread.innerHTML = '';
                showEmptyState(true);
                loadConversations();
            }
        } catch (e) {
            console.error("Failed to clear conversation history", e);
        }
    }

    function filterConversations() {
        const query = searchInput.value.toLowerCase().trim();
        const items = document.querySelectorAll('.conversation-item');
        
        items.forEach(item => {
            const title = item.querySelector('.conv-title').textContent.toLowerCase();
            if (title.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    function startNewChat() {
        if (currentStreamController) {
            currentStreamController.abort();
            stopStreamingState();
        }
        
        activeConversationId = null;
        chatThread.innerHTML = '';
        showEmptyState(true);
        
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        chatInput.focus();
    }

    // --- Model Selection API & Dropdown UI ---
    async function loadModels() {
        try {
            const res = await fetch('/api/models');
            const groups = await res.json();
            
            dropdownMenu.innerHTML = '';
            let defaultSelectedSet = false;
            
            groups.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'dropdown-provider-group';
                
                const groupTitle = document.createElement('div');
                groupTitle.className = 'dropdown-provider-title';
                groupTitle.textContent = `${group.provider_label} (${group.available ? 'Active' : 'Add API key in .env'})`;
                groupDiv.appendChild(groupTitle);
                
                group.models.forEach(model => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item';
                    if (!group.available) {
                        item.className += ' disabled';
                        item.setAttribute('data-tooltip', 'Add API key in .env');
                    }
                    
                    item.innerHTML = `
                        <span>${escapeHtml(model.label)}</span>
                        ${model.model_id === 'custom-openrouter' ? '<span style="font-size: 10px; color: var(--text-muted)">Type custom ID</span>' : ''}
                    `;
                    
                    if (group.available) {
                        item.addEventListener('click', () => {
                            selectModel(model.model_id);
                        });
                        
                        // Pick first available model as default selection on startup
                        if (!defaultSelectedSet) {
                            selectModel(model.model_id, false);
                            defaultSelectedSet = true;
                        }
                    }
                    
                    groupDiv.appendChild(item);
                });
                
                dropdownMenu.appendChild(groupDiv);
            });
            
            // If all providers are disabled/no keys set
            if (!defaultSelectedSet && groups.length > 0) {
                // Fallback to select first item in registry anyway so dropdown is not empty
                const firstGroup = groups[0];
                if (firstGroup.models.length > 0) {
                    selectModel(firstGroup.models[0].model_id, false);
                }
            }
            
        } catch (e) {
            console.error("Error loading model list", e);
        }
    }

    function selectModel(modelId, triggerUiReset = true) {
        selectedModelIdInput.value = modelId;
        
        // Find corresponding group and model text
        // E.g., we query custom label or resolve it
        let label = modelId;
        let provider = "Custom";
        
        if (modelId === "custom-openrouter") {
            label = "Custom Model";
            provider = "OpenRouter";
            if (triggerUiReset) {
                customModelContainer.classList.remove('hidden');
                customModelInput.focus();
            }
        } else {
            if (triggerUiReset) {
                customModelContainer.classList.add('hidden');
            }
            // Fetch clean names
            // E.g., resolve labels based on UI items
            const items = document.querySelectorAll('.dropdown-item:not(.disabled)');
            items.forEach(item => {
                // We'll update highlighted item in dropdown
                item.classList.remove('active');
            });
        }
        
        // Try parsing labels dynamically
        fetch('/api/models')
            .then(res => res.json())
            .then(groups => {
                groups.forEach(g => {
                    g.models.forEach(m => {
                        if (m.model_id === modelId) {
                            selectedProviderBadge.textContent = g.provider_label;
                            selectedModelName.textContent = m.label;
                            modelIndicatorFooter.textContent = `${g.provider_label} - ${m.label}`;
                            
                            // Highlight in list
                            document.querySelectorAll('.dropdown-item').forEach(item => {
                                if (item.textContent.includes(m.label)) {
                                    item.classList.add('active');
                                }
                            });
                        }
                    });
                });
            });
            
        dropdown.classList.remove('open');
    }

    // --- Message Bubbles Rendering ---
    function appendMessageBubble(role, text, id, isStreaming = false) {
        const row = document.createElement('div');
        row.className = `message-row ${role}`;
        if (id) row.setAttribute('data-msg-id', id);
        
        const meta = document.createElement('div');
        meta.className = 'message-meta';
        
        let iconSvg = '';
        if (role === 'user') {
            iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
            meta.innerHTML = `${iconSvg} <span>You</span>`;
        } else {
            iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 2a10 10 0 1 1-10 10h10V2z"/></svg>`;
            const modelLabel = selectedModelName.textContent;
            meta.innerHTML = `${iconSvg} <span>Assistant (${modelLabel})</span>`;
        }
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble markdown-body';
        if (isStreaming) {
            bubble.classList.add('streaming-active');
        }
        
        if (role === 'user') {
            bubble.textContent = text;
        } else {
            bubble.innerHTML = marked.parse(text);
        }
        
        row.appendChild(meta);
        row.appendChild(bubble);
        chatThread.appendChild(row);
        
        scrollToBottom();
        return bubble;
    }

    function appendSystemError(title, message) {
        const row = document.createElement('div');
        row.className = 'message-row system';
        
        row.innerHTML = `
            <div class="system-error-card">
                <svg class="error-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <div class="error-content">
                    <h4>${escapeHtml(title)}</h4>
                    <p>${escapeHtml(message)}</p>
                </div>
            </div>
        `;
        chatThread.appendChild(row);
        scrollToBottom();
    }

    function showEmptyState(show) {
        if (show) {
            emptyState.classList.remove('hidden');
            chatThread.classList.add('hidden');
            clearChatBtn.style.display = 'none';
        } else {
            emptyState.classList.add('hidden');
            chatThread.classList.remove('hidden');
            clearChatBtn.style.display = 'block';
        }
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // --- Input Form Operations ---
    function adjustInputHeight() {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    }

    function toggleSendButton() {
        const text = chatInput.value.trim();
        if (text.length > 0 || attachedFile !== null || currentStreamController !== null) {
            sendBtn.disabled = false;
        } else {
            sendBtn.disabled = true;
        }
    }

    // --- File Reading Handler ---
    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Read file contents if it's text
        const reader = new FileReader();
        reader.onload = function(evt) {
            attachedFile = {
                name: file.name,
                content: evt.target.result,
                language: getFileLanguage(file.name)
            };
            
            // Show attached file indicator
            attachedFileName.textContent = file.name;
            attachedFilesContainer.classList.remove('hidden');
            toggleSendButton();
            chatInput.focus();
        };
        
        reader.onerror = function() {
            alert("Error reading file contents. Only text-based files are supported.");
        };
        
        reader.readAsText(file);
    }

    function getFileLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const map = {
            'js': 'javascript',
            'py': 'python',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'csv': 'csv'
        };
        return map[ext] || 'text';
    }

    function removeAttachment() {
        attachedFile = null;
        fileInput.value = '';
        attachedFilesContainer.classList.add('hidden');
        toggleSendButton();
    }

    // --- SSE Chat Streaming Logic ---
    async function handleSendMessage() {
        const text = chatInput.value.trim();
        const modelId = selectedModelIdInput.value;
        const customModel = customModelInput.value.trim();
        
        if (text.length === 0 && attachedFile === null) return;
        
        // 1. Construct final prompt injecting files if necessary
        let finalContent = text;
        if (attachedFile) {
            finalContent = `[Attached file: ${attachedFile.name}]\n\`\`\`${attachedFile.language}\n${attachedFile.content}\n\`\`\`\n\n${text}`;
        }
        
        // 2. Clear input fields immediately
        chatInput.value = '';
        removeAttachment();
        adjustInputHeight();
        toggleSendButton();
        
        // 3. Show chat thread view
        if (emptyState.classList.contains('hidden') === false) {
            showEmptyState(false);
            chatThread.innerHTML = '';
        }
        
        // 4. Create active conversation if it doesn't exist
        if (!activeConversationId) {
            try {
                // Determine display title
                let displayTitle = text.split("\n")[0];
                if (displayTitle.length > 30) displayTitle = displayTitle.slice(0, 30) + '...';
                if (!displayTitle) displayTitle = "New Chat";
                
                const convRes = await fetch('/api/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model_id: modelId, title: displayTitle })
                });
                const convData = await convRes.json();
                activeConversationId = convData.id;
                
                // Refresh list
                loadConversations();
            } catch (e) {
                appendSystemError("App Error", `Could not create conversation: ${e.message}`);
                return;
            }
        }
        
        // 5. Render user message in UI
        appendMessageBubble('user', text, null, false);
        
        // 6. Setup loading assistant bubble
        const assistantBubble = appendMessageBubble('assistant', '', null, true);
        
        // 7. Start stream fetch
        startStreamingState();
        currentStreamController = new AbortController();
        
        let assistantTextBuffer = '';
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversation_id: activeConversationId,
                    model_id: modelId,
                    content: finalContent,
                    custom_model: modelId === 'custom-openrouter' ? customModel : null
                }),
                signal: currentStreamController.signal
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
            
            // Read stream chunks
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                // Process completed lines, keep the last incomplete one
                buffer = lines.pop();
                
                for (const line of lines) {
                    const cleanedLine = line.trim();
                    if (!cleanedLine.startsWith('data: ')) continue;
                    
                    const jsonStr = cleanedLine.slice(6);
                    try {
                        const payload = JSON.parse(jsonStr);
                        
                        if (payload.type === 'token') {
                            assistantTextBuffer += payload.content;
                            // Typewriter update: update bubble markdown HTML
                            assistantBubble.innerHTML = marked.parse(assistantTextBuffer);
                            scrollToBottom();
                        } else if (payload.type === 'error') {
                            // Yield clean inline warning
                            assistantBubble.classList.remove('streaming-active');
                            appendSystemError("Model / Connection Error", payload.content);
                        } else if (payload.type === 'done') {
                            // Completed! Update conversation title in sidebar if it was updated
                            if (payload.conversation_title) {
                                updateConversationTitleUI(activeConversationId, payload.conversation_title);
                            }
                        }
                    } catch (parseErr) {
                        console.warn("Could not parse SSE token", jsonStr, parseErr);
                    }
                }
            }
            
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log("Stream execution aborted by user.");
            } else {
                assistantBubble.classList.remove('streaming-active');
                appendSystemError("Stream Error", e.message);
            }
        } finally {
            // Restore regular UI states
            stopStreamingState();
            assistantBubble.classList.remove('streaming-active');
            scrollToBottom();
            
            // Highlight code blocks
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    }

    function startStreamingState() {
        sendBtn.classList.add('streaming');
        sendBtn.title = "Stop generating";
        sendBtn.querySelector('.send-icon').classList.add('hidden');
        sendBtn.querySelector('.stop-icon').classList.remove('hidden');
    }

    function stopStreamingState() {
        currentStreamController = null;
        sendBtn.classList.remove('streaming');
        sendBtn.title = "Send message";
        sendBtn.querySelector('.send-icon').classList.remove('hidden');
        sendBtn.querySelector('.stop-icon').classList.add('hidden');
        toggleSendButton();
    }

    function updateConversationTitleUI(id, title) {
        const item = document.querySelector(`.conversation-item[data-id="${id}"]`);
        if (item) {
            const titleEl = item.querySelector('.conv-title');
            if (titleEl) titleEl.textContent = title;
        } else {
            // Reload sidebar list if new item
            loadConversations();
        }
    }

    // Run app init
    init();
});

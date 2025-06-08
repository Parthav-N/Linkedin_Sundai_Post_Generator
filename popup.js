document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const chatContainer = document.getElementById('chat-container');
  const loadingIndicator = document.getElementById('loading-indicator');
  const autoCommentsCheckbox = document.getElementById('enableAutoComments');
  const saveSettingsButton = document.getElementById('save-settings');
  const apiStatusElement = document.getElementById('api-status');
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Templates
  const userMessageTemplate = document.getElementById('user-message-template');
  const botMessageTemplate = document.getElementById('bot-message-template');
  const postMessageTemplate = document.getElementById('post-message-template');
  
  // Current generated post content
  let currentGeneratedPost = null;
  
  // Chat history
  let chatHistory = [];
  
  // Base API URLs
  const baseUrls = [
    'https://linkedin-post-generator-backend.onrender.com',
    'http://linkedin-post-generator-backend.onrender.com'
  ];
  
  // Projects Manager
  let projectsManager = null;
  
  // Check API Status
  checkAPIStatus();
  checkFirebaseStatus();
  
  // Event Listeners
  sendButton.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      activateTab(tabName);
    });
  });
  
  // Save settings button
  saveSettingsButton.addEventListener('click', saveSettings);
  
  // Load settings
  loadSettings();
  
  // Initialize by loading chat history
  loadChatHistory();
  
  // ===== PROJECTS TAB FUNCTIONALITY =====
  
  // Firebase Service for Extension
  class FirebaseService {
    constructor() {
      this.baseUrl = 'https://linkedin-post-generator-backend.onrender.com';
      this.cache = new Map();
      this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }
    
    async fetchProjects() {
      try {
        // Check cache first
        const cached = this.cache.get('projects');
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
        
        const response = await fetch(`${this.baseUrl}/get_projects`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache the result
        this.cache.set('projects', {
          data: data,
          timestamp: Date.now()
        });
        
        return data;
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
    }
    
    async generateProjectPost(projectData) {
      try {
        const response = await fetch(`${this.baseUrl}/generate_project_post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(projectData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error generating project post:', error);
        throw error;
      }
    }
    
    clearCache() {
      this.cache.clear();
    }
  }
  
  // Projects Tab Manager
  class ProjectsTabManager {
    constructor() {
      this.firebaseService = new FirebaseService();
      this.projects = [];
      this.filteredProjects = [];
      this.isLoading = false;
      
      // DOM elements (will be set when tab is initialized)
      this.projectsList = null;
      this.projectsLoading = null;
      this.projectsError = null;
      this.projectsCount = null;
      this.searchInput = null;
    }
    
    initialize() {
      // Get DOM elements
      this.projectsList = document.getElementById('projects-list');
      this.projectsLoading = document.getElementById('projects-loading');
      this.projectsError = document.getElementById('projects-error');
      this.projectsCount = document.getElementById('projects-count');
      
      // Add search functionality
      this.addSearchBox();
      
      // Add retry button functionality
      const retryButton = document.getElementById('retry-projects');
      if (retryButton) {
        retryButton.addEventListener('click', () => this.loadProjects());
      }
      
      // Load projects
      this.loadProjects();
    }
    
    addSearchBox() {
      if (!this.projectsList) return;
      
      const searchContainer = document.createElement('div');
      searchContainer.className = 'search-projects';
      searchContainer.innerHTML = `
        <input type="text" placeholder="Search projects..." id="search-projects-input">
      `;
      
      this.projectsList.parentNode.insertBefore(searchContainer, this.projectsList);
      
      this.searchInput = document.getElementById('search-projects-input');
      this.searchInput.addEventListener('input', (e) => {
        this.filterProjects(e.target.value);
      });
    }
    
    async loadProjects() {
      if (this.isLoading) return;
      
      this.isLoading = true;
      this.showLoading();
      
      try {
        const response = await this.firebaseService.fetchProjects();
        
        if (response.success && response.projects) {
          this.projects = response.projects;
          this.filteredProjects = [...this.projects];
          this.renderProjects();
          this.updateProjectsCount();
          this.hideLoading();
        } else {
          throw new Error(response.error || 'Failed to fetch projects');
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        this.showError();
      } finally {
        this.isLoading = false;
      }
    }
    
    filterProjects(searchTerm) {
      if (!searchTerm.trim()) {
        this.filteredProjects = [...this.projects];
      } else {
        const term = searchTerm.toLowerCase();
        this.filteredProjects = this.projects.filter(project => 
          project.title.toLowerCase().includes(term) ||
          (project.team_lead && project.team_lead.toLowerCase().includes(term)) ||
          (project.team_members && project.team_members.some(member => 
            member.toLowerCase().includes(term)
          ))
        );
      }
      
      this.renderProjects();
      this.updateProjectsCount();
    }
    
    renderProjects() {
      if (!this.projectsList) return;
      
      if (this.filteredProjects.length === 0) {
        this.projectsList.innerHTML = `
          <div class="no-projects">
            <p>No projects found${this.searchInput && this.searchInput.value ? ' matching your search' : ''}.</p>
          </div>
        `;
        return;
      }
      
      this.projectsList.innerHTML = this.filteredProjects.map(project => `
        <div class="project-item" data-project-id="${project.id}">
          <div class="project-info">
            <h4 class="project-title">${this.escapeHtml(project.title)}</h4>
            <div class="project-meta">
              ${project.team_lead ? `<span class="project-team">👤 ${this.escapeHtml(project.team_lead)}</span>` : ''}
              ${project.team_members && project.team_members.length > 0 ? 
                `<span class="project-team">👥 ${project.team_members.length} member${project.team_members.length !== 1 ? 's' : ''}</span>` : ''}
              ${project.last_updated ? `<span class="project-date">📅 ${this.formatDate(project.last_updated)}</span>` : ''}
            </div>
          </div>
          <div class="project-arrow">→</div>
        </div>
      `).join('');
      
      // Add click event listeners
      this.projectsList.querySelectorAll('.project-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const projectId = e.currentTarget.getAttribute('data-project-id');
          this.handleProjectClick(projectId);
        });
      });
    }
    
    async handleProjectClick(projectId) {
      const project = this.projects.find(p => p.id === projectId);
      if (!project) return;
      
      try {
        // Switch to chat tab
        activateTab('chat');
        
        // Show loading in chat
        loadingIndicator.style.display = 'flex';
        
        // Prepare project data for post generation
        const projectData = {
          title: project.title,
          description: project.description || 'No description available',
          team_lead: project.team_lead || '',
          team_members: project.team_members || [],
          demo_url: project.demo_url || '',
          github_url: project.github_url || '',
          blog_url: project.blog_url || '',
          tags: project.tags || []
        };
        
        // Generate LinkedIn post
        const response = await this.firebaseService.generateProjectPost(projectData);
        
        // Hide loading
        loadingIndicator.style.display = 'none';
        
        if (response.success && response.post) {
          // Add to chat history
          addUserMessage(`Generate a LinkedIn post for: ${project.title}`);
          addPostMessage(response.post);
          currentGeneratedPost = response.post;
        } else {
          addBotMessage('Sorry, there was an error generating the LinkedIn post for this project.');
        }
        
      } catch (error) {
        console.error('Error handling project click:', error);
        
        // Hide loading
        loadingIndicator.style.display = 'none';
        
        addBotMessage('Sorry, there was an error generating the LinkedIn post. Please try again.');
      }
    }
    
    showLoading() {
      if (this.projectsLoading) this.projectsLoading.style.display = 'flex';
      if (this.projectsError) this.projectsError.style.display = 'none';
      if (this.projectsList) this.projectsList.style.display = 'none';
    }
    
    hideLoading() {
      if (this.projectsLoading) this.projectsLoading.style.display = 'none';
      if (this.projectsList) this.projectsList.style.display = 'block';
    }
    
    showError() {
      if (this.projectsLoading) this.projectsLoading.style.display = 'none';
      if (this.projectsError) this.projectsError.style.display = 'block';
      if (this.projectsList) this.projectsList.style.display = 'none';
    }
    
    updateProjectsCount() {
      if (this.projectsCount) {
        const total = this.projects.length;
        const filtered = this.filteredProjects.length;
        
        if (total === filtered) {
          this.projectsCount.textContent = `${total} project${total !== 1 ? 's' : ''}`;
        } else {
          this.projectsCount.textContent = `${filtered} of ${total} project${total !== 1 ? 's' : ''}`;
        }
      }
    }
    
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    formatDate(dateString) {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
      } catch {
        return 'Recently';
      }
    }
  }
  
  // ===== MAIN FUNCTIONS =====
  
  function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addUserMessage(message);
    userInput.value = '';
    
    // Show loading indicator
    loadingIndicator.style.display = 'flex';
    
    // Make API request
    makeNetworkRequest('generate_post', { context: message })
      .then(response => {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        if (response.success) {
          currentGeneratedPost = response.post;
          addPostMessage(response.post);
          chatContainer.scrollTop = chatContainer.scrollHeight;
        } else {
          addBotMessage(response.error || 'Sorry, there was an error generating your post.');
        }
      });
  }
  
  function regeneratePost() {
    if (!hasUserMessages()) return;
    
    // Show loading indicator
    loadingIndicator.style.display = 'flex';
    
    // Get the last user message
    const lastUserMessage = getLastUserMessage();
    
    // Make API request
    makeNetworkRequest('regenerate_post', { context: lastUserMessage })
      .then(response => {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        if (response.success) {
          // Remove previous post messages
          removePostMessages();
          
          currentGeneratedPost = response.post;
          addPostMessage(response.post);
          chatContainer.scrollTop = chatContainer.scrollHeight;
        } else {
          addBotMessage(response.error || 'Sorry, there was an error regenerating your post.');
        }
      });
  }
  
  function modifyPost(action) {
    if (!currentGeneratedPost || !hasUserMessages()) return;
    
    // Show loading indicator
    loadingIndicator.style.display = 'flex';
    
    // Get the last user message
    const lastUserMessage = getLastUserMessage();
    
    // Make API request
    makeNetworkRequest('modify_post', {
      context: lastUserMessage,
      current_post: currentGeneratedPost,
      action: action
    })
      .then(response => {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        if (response.success) {
          // Remove previous post messages
          removePostMessages();
          
          currentGeneratedPost = response.post;
          addPostMessage(response.post);
          chatContainer.scrollTop = chatContainer.scrollHeight;
        } else {
          addBotMessage(response.error || `Sorry, there was an error ${action}ing your post.`);
        }
      });
  }
  
  function insertIntoLinkedIn() {
    if (!currentGeneratedPost) return;
    
    // Send message to content script to insert the post
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'insertText',
        text: currentGeneratedPost
      }, function(response) {
        if (response && response.success) {
          addBotMessage('Post successfully inserted into LinkedIn!');
        } else {
          addBotMessage('Could not insert text. Make sure you are on LinkedIn and have a post editor open.');
          
          // Copy to clipboard as fallback
          navigator.clipboard.writeText(currentGeneratedPost)
            .then(() => {
              addBotMessage('Post copied to clipboard instead.');
            })
            .catch(err => {
              console.error('Could not copy text: ', err);
            });
        }
      });
    });
  }
  
  // Helper Functions
  function addUserMessage(text) {
    const template = userMessageTemplate.content.cloneNode(true);
    template.querySelector('p').textContent = text;
    chatContainer.appendChild(template);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Save to history
    chatHistory.push({
      type: 'user',
      text: text
    });
    saveChatHistory();
  }
  
  function addBotMessage(text) {
    const template = botMessageTemplate.content.cloneNode(true);
    template.querySelector('p').textContent = text;
    chatContainer.appendChild(template);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Save to history
    chatHistory.push({
      type: 'bot',
      text: text
    });
    saveChatHistory();
  }
  
  function addPostMessage(text) {
    const template = postMessageTemplate.content.cloneNode(true);
    const postContent = template.querySelector('.post-content');
    postContent.textContent = text;
    
    // Add event listeners to buttons
    template.querySelector('.regenerate-button').addEventListener('click', regeneratePost);
    template.querySelector('.reduce-button').addEventListener('click', () => modifyPost('reduce'));
    template.querySelector('.elaborate-button').addEventListener('click', () => modifyPost('elaborate'));
    template.querySelector('.share-button').addEventListener('click', insertIntoLinkedIn);
    
    // Add event listener for copy functionality
    template.querySelector('.copy-hint').addEventListener('click', () => {
      navigator.clipboard.writeText(text)
        .then(() => {
          addBotMessage('Post copied to clipboard.');
        })
        .catch(err => {
          console.error('Could not copy text: ', err);
        });
    });
    
    chatContainer.appendChild(template);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Save to history
    chatHistory.push({
      type: 'post',
      text: text
    });
    saveChatHistory();
    
    // Save the current generated post to session storage for persistence
    chrome.storage.session.set({ 'currentGeneratedPost': text });
  }
  
  function hasUserMessages() {
    return chatContainer.querySelector('.user-message') !== null;
  }
  
  function getLastUserMessage() {
    const userMessages = chatContainer.querySelectorAll('.user-message p');
    if (userMessages.length === 0) return '';
    return userMessages[userMessages.length - 1].textContent;
  }
  
  function removePostMessages() {
    const postMessages = chatContainer.querySelectorAll('.post-message');
    postMessages.forEach(message => message.remove());
    
    // Update history by removing post messages
    chatHistory = chatHistory.filter(msg => msg.type !== 'post');
    saveChatHistory();
  }
  
  // Tab Functions
  function activateTab(tabName) {
    // Update tab buttons
    tabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Update tab content
    tabContents.forEach(content => {
      if (content.id === `${tabName}-tab`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
    
    // Initialize projects tab if selected for the first time
    if (tabName === 'projects' && !projectsManager) {
      projectsManager = new ProjectsTabManager();
      projectsManager.initialize();
    }
  }
  
  // Settings Functions
  function loadSettings() {
    chrome.storage.sync.get(['enableAutoComments'], function(result) {
      console.log('Loading settings:', result);
      // Default to enabled if setting doesn't exist
      autoCommentsCheckbox.checked = result.enableAutoComments !== false;
    });
  }
  
  function saveSettings() {
    // Save the settings with explicit boolean values
    const settings = {
      'enableAutoComments': Boolean(autoCommentsCheckbox.checked)
    };
    
    console.log('Saving settings:', settings);
    
    chrome.storage.sync.set(settings, function() {
      // Debug: Verify what we just saved
      chrome.storage.sync.get(['enableAutoComments'], function(result) {
        console.log('Verified saved settings:', result);
      });
      
      saveSettingsButton.textContent = 'Saved!';
      
      // Notify all tabs about the settings change
      chrome.tabs.query({url: "https://www.linkedin.com/*"}, function(tabs) {
        console.log('Found LinkedIn tabs to notify:', tabs.length);
        tabs.forEach(tab => {
          try {
            chrome.tabs.sendMessage(tab.id, {
              action: 'settingsChanged',
              settings: settings
            }, function(response) {
              console.log('Tab notification response:', response);
            });
          } catch (error) {
            console.error('Error sending message to tab:', error);
          }
        });
      });
      
      setTimeout(() => {
        saveSettingsButton.textContent = 'Save Settings';
      }, 1500);
    });
  }
  
  // API Status Check
  async function checkAPIStatus() {
    apiStatusElement.textContent = 'Checking...';
    
    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/health`, {
          method: 'GET'
        });
        
        if (response.ok) {
          apiStatusElement.textContent = '✅ Connected';
          apiStatusElement.style.color = 'green';
          return;
        }
      } catch (error) {
        console.error(`Error with ${baseUrl}:`, error);
        // Continue to next URL
      }
    }
    
    apiStatusElement.textContent = '❌ Disconnected';
    apiStatusElement.style.color = 'red';
  }
  
  // Firebase Status Check
  async function checkFirebaseStatus() {
    const firebaseStatusElement = document.getElementById('firebase-status');
    if (!firebaseStatusElement) return;
    
    firebaseStatusElement.textContent = 'Checking...';
    
    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/projects_health`, {
          method: 'GET'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.firebase_connected) {
            firebaseStatusElement.textContent = '✅ Connected';
            firebaseStatusElement.style.color = 'green';
          } else {
            firebaseStatusElement.textContent = '❌ Not Connected';
            firebaseStatusElement.style.color = 'red';
          }
          return;
        }
      } catch (error) {
        console.error(`Error checking Firebase status:`, error);
        // Continue to next URL
      }
    }
    
    firebaseStatusElement.textContent = '❌ Error';
    firebaseStatusElement.style.color = 'red';
  }
  
  // Persistence Functions
  function saveChatHistory() {
    // Save chat history to session storage (cleared when browser closes)
    chrome.storage.session.set({ 'chatHistory': chatHistory });
    chrome.storage.session.set({ 'currentGeneratedPost': currentGeneratedPost });
  }
  
  function loadChatHistory() {
    // Load chat history from session storage
    chrome.storage.session.get(['chatHistory', 'currentGeneratedPost'], function(result) {
      if (result.chatHistory && result.chatHistory.length > 0) {
        chatHistory = result.chatHistory;
        
        // Clear chat container first
        chatContainer.innerHTML = '';
        
        // Rebuild chat UI from history
        chatHistory.forEach(message => {
          if (message.type === 'user') {
            const template = userMessageTemplate.content.cloneNode(true);
            template.querySelector('p').textContent = message.text;
            chatContainer.appendChild(template);
          } else if (message.type === 'bot') {
            const template = botMessageTemplate.content.cloneNode(true);
            template.querySelector('p').textContent = message.text;
            chatContainer.appendChild(template);
          } else if (message.type === 'post') {
            const template = postMessageTemplate.content.cloneNode(true);
            const postContent = template.querySelector('.post-content');
            postContent.textContent = message.text;
            
            // Add event listeners to buttons
            template.querySelector('.regenerate-button').addEventListener('click', regeneratePost);
            template.querySelector('.reduce-button').addEventListener('click', () => modifyPost('reduce'));
            template.querySelector('.elaborate-button').addEventListener('click', () => modifyPost('elaborate'));
            template.querySelector('.share-button').addEventListener('click', insertIntoLinkedIn);
            
            // Add event listener for copy functionality
            template.querySelector('.copy-hint').addEventListener('click', () => {
              navigator.clipboard.writeText(message.text)
                .then(() => {
                  addBotMessage('Post copied to clipboard.');
                })
                .catch(err => {
                  console.error('Could not copy text: ', err);
                });
            });
            
            chatContainer.appendChild(template);
          }
        });
        
        // Restore current generated post
        if (result.currentGeneratedPost) {
          currentGeneratedPost = result.currentGeneratedPost;
        }
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
      } else {
        // No history - add a welcome message
        addBotMessage('Welcome to LinkedIn Assistant Pro! I can help you with:' + 
                     '\n\n1. Generating engaging LinkedIn posts - just type what you want to post about' + 
                     '\n2. Browse Sundai Club projects and generate posts for them' +
                     '\n3. Auto-generating comments on LinkedIn posts (enabled by default)' +
                     '\n\nUse the tabs above to switch between features!');
      }
    });
  }
  
  // Network Functions
  async function makeNetworkRequest(endpoint, requestBody) {
    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            post: data.post || data.comment
          };
        }
      } catch (error) {
        console.error(`Error with ${baseUrl}:`, error);
        // Continue to next URL
      }
    }
    
    return {
      success: false,
      error: 'Unable to connect to the server. Please check your internet connection and try again.'
    };
  }
  
  // Add a clear history button
  function addClearHistoryButton() {
    const headerDiv = document.querySelector('.header');
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear Chat';
    clearButton.style.position = 'absolute';
    clearButton.style.right = '10px';
    clearButton.style.top = '10px';
    clearButton.style.fontSize = '12px';
    clearButton.style.padding = '4px 8px';
    clearButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    clearButton.style.border = 'none';
    clearButton.style.borderRadius = '4px';
    clearButton.style.color = 'white';
    clearButton.style.cursor = 'pointer';
    
    clearButton.addEventListener('click', function() {
      chatHistory = [];
      currentGeneratedPost = null;
      chrome.storage.session.remove(['chatHistory', 'currentGeneratedPost']);
      chatContainer.innerHTML = '';
      addBotMessage('Welcome to LinkedIn Assistant Pro! I can help you with:' + 
                   '\n\n1. Generating engaging LinkedIn posts - just type what you want to post about' + 
                   '\n2. Browse Sundai Club projects and generate posts for them' +
                   '\n3. Auto-generating comments on LinkedIn posts (enabled by default)' +
                   '\n\nUse the tabs above to switch between features!');
    });
    
    headerDiv.appendChild(clearButton);
  }
  
  // Add the clear history button
  addClearHistoryButton();
});
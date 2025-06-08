// template-manager.js - Handles template selection, form generation, and post creation

class TemplateManager {
  constructor() {
    // DOM elements
    this.templatesTab = document.getElementById('templates-tab');
    this.templatesContainer = this.templatesTab.querySelector('.templates-container');
    this.templatesCategories = this.templatesTab.querySelector('.templates-categories');
    this.templateFormContainer = this.templatesTab.querySelector('.template-form-container');
    this.templateForm = document.getElementById('template-form');
    this.templateFields = this.templatesTab.querySelector('.template-fields');
    this.templateTitle = this.templatesTab.querySelector('.template-title');
    this.backButton = this.templatesTab.querySelector('.back-button');
    this.generateButton = document.getElementById('generate-from-template');
    this.templateLoading = this.templatesTab.querySelector('.template-loading');
    
    // Current template
    this.currentTemplate = null;
    
    // Initialize
    this.init();
  }
  
  init() {
    // Render template categories
    this.renderTemplateCategories();
    
    // Add event listeners
    this.backButton.addEventListener('click', () => this.showTemplateCategories());
    this.templateForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    
    // Check if we should highlight recommended templates
    this.highlightRecommendedTemplates();
  }
  
  renderTemplateCategories() {
    // Clear existing content
    this.templatesCategories.innerHTML = '';
    
    // Get all templates
    const templates = window.LinkedInTemplates.getAllTemplates();
    
    // Create template cards
    templates.forEach(template => {
      const card = this.createTemplateCard(template);
      this.templatesCategories.appendChild(card);
    });
  }
  
  createTemplateCard(template) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.dataset.templateId = template.id;
    
    // Check if this template is recommended for today
    const recommendedTemplates = window.LinkedInTemplates.getTodayRecommendedTemplates();
    if (recommendedTemplates.some(t => t.id === template.id)) {
      card.classList.add('recommended');
    }
    
    card.innerHTML = `
      <div class="template-icon">${template.icon}</div>
      <div class="template-name">${template.name}</div>
      <div class="template-description">${template.description}</div>
      <div class="template-days">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        Best on: ${template.recommendedDays.join(', ')}
      </div>
    `;
    
    // Add click event
    card.addEventListener('click', () => this.selectTemplate(template.id));
    
    return card;
  }
  
  selectTemplate(templateId) {
    // Get template by ID
    const template = window.LinkedInTemplates.getTemplateById(templateId);
    if (!template) return;
    
    // Store current template
    this.currentTemplate = template;
    
    // Update title
    this.templateTitle.textContent = template.name;
    
    // Generate form fields
    this.generateFormFields(template);
    
    // Show form container
    this.showTemplateForm();
  }
  
  generateFormFields(template) {
    // Clear existing fields
    this.templateFields.innerHTML = '';
    
    // Add fields based on template
    template.fields.forEach(field => {
      const fieldGroup = document.createElement('div');
      fieldGroup.className = 'field-group';
      
      // Create label
      const label = document.createElement('label');
      label.className = field.required ? 'field-label required-field' : 'field-label';
      label.setAttribute('for', field.id);
      label.textContent = field.name;
      fieldGroup.appendChild(label);
      
      // Create input based on field type
      let input;
      
      switch (field.type) {
        case 'select':
          input = document.createElement('select');
          input.className = 'field-select';
          
          // Add options
          field.options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option;
            optionEl.textContent = option;
            input.appendChild(optionEl);
          });
          break;
          
        case 'textarea':
          input = document.createElement('textarea');
          input.className = 'field-textarea';
          input.placeholder = field.placeholder || '';
          break;
          
        default: // text
          input = document.createElement('input');
          input.className = 'field-input';
          input.type = 'text';
          input.placeholder = field.placeholder || '';
          
          // Add maxLength if specified
          if (field.maxLength) {
            input.maxLength = field.maxLength;
          }
          break;
      }
      
      // Set common attributes
      input.id = field.id;
      input.name = field.id;
      input.required = field.required;
      
      fieldGroup.appendChild(input);
      this.templateFields.appendChild(fieldGroup);
    });
  }
  
  showTemplateCategories() {
    this.templatesCategories.style.display = 'grid';
    this.templateFormContainer.style.display = 'none';
  }
  
  showTemplateForm() {
    this.templatesCategories.style.display = 'none';
    this.templateFormContainer.style.display = 'block';
  }
  
  highlightRecommendedTemplates() {
    const recommendedTemplates = window.LinkedInTemplates.getTodayRecommendedTemplates();
    const recommendedText = this.templatesTab.querySelector('.templates-recommended');
    
    if (recommendedTemplates.length > 0) {
      const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      recommendedText.textContent = `Recommended for ${day}`;
    } else {
      recommendedText.style.display = 'none';
    }
  }
  
  showLoading() {
    this.templateLoading.style.display = 'flex';
    this.generateButton.disabled = true;
  }
  
  hideLoading() {
    this.templateLoading.style.display = 'none';
    this.generateButton.disabled = false;
  }
  
  async handleFormSubmit(e) {
    e.preventDefault();
    
    // Show loading
    this.showLoading();
    
    // Get form data
    const formData = new FormData(this.templateForm);
    const templateData = {};
    
    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      templateData[key] = value;
    }
    
    // Add template metadata
    templateData.templateId = this.currentTemplate.id;
    templateData.templateName = this.currentTemplate.name;
    templateData.templateStyle = this.currentTemplate.style;
    
    try {
      // Generate post using the template data
      const generatedPost = await this.generatePostFromTemplate(templateData);
      
      // Hide loading
      this.hideLoading();
      
      // Add the generated post to the chat
      if (window.addPostMessage && typeof window.addPostMessage === 'function') {
        window.currentGeneratedPost = generatedPost;
        window.addPostMessage(generatedPost);
        
        // Switch to chat tab to show the result
        if (window.activateTab && typeof window.activateTab === 'function') {
          window.activateTab('chat');
        }
      } else {
        console.error('addPostMessage function not available');
        alert('Post generated but could not be displayed. Please try again.');
      }
    } catch (error) {
      console.error('Error generating post:', error);
      this.hideLoading();
      alert('Failed to generate post. Please try again.');
    }
  }
  
  async generatePostFromTemplate(templateData, isRegeneration = false) {
    // Base API URLs (incluyendo el backend Docker local)
    const baseUrls = [
      'http://localhost:5002',  // Docker local backend
      'https://linkedin-post-generator-backend.onrender.com',
      'http://linkedin-post-generator-backend.onrender.com'
    ];
    
    // Get tone and length from form
    const tone = document.getElementById('post-tone')?.value || 'Professional';
    const length = document.getElementById('post-length')?.value || 'Medium';
    const humanize = document.getElementById('humanize-level')?.value || 50;
    
    // Extract form data
    const formData = {};
    Object.keys(templateData).forEach(key => {
      // Skip metadata fields
      if (!['templateId', 'templateName', 'templateStyle', 'tone', 'length', 'humanize'].includes(key)) {
        formData[key] = templateData[key];
      }
    });
    
    // Check for custom example in settings
    const templateExample = document.getElementById('template-example')?.value || '';
    const templateUrl = document.getElementById('template-url')?.value || '';
    
    // Prepare request body for new Docker backend format
    const requestBody = {
      templateId: templateData.templateId,
      templateType: templateData.templateName,
      templateStyle: templateData.templateStyle,
      formData: formData,
      tone: tone,
      length: length,
      humanize: parseInt(humanize)
    };
    
    // Add example post or URL if available
    if (templateExample && templateExample.trim() !== '') {
      requestBody.examplePost = templateExample.trim();
    }
    
    if (templateUrl && templateUrl.trim() !== '') {
      requestBody.exampleUrl = templateUrl.trim();
    }
    
    // Store the request body for regeneration
    if (!isRegeneration) {
      window.lastTemplateRequest = requestBody;
    }
    
    console.log('Sending template data to backend:', requestBody);
    
    // Try each base URL until one works
    for (const baseUrl of baseUrls) {
      try {
        console.log(`Trying ${baseUrl}/generate_from_template`);
        const response = await fetch(`${baseUrl}/generate_from_template`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Response from backend:', data);
          
          // Store the response data for editing
          window.lastGeneratedPostData = data;
          
          return data.post;
        }
      } catch (error) {
        console.error(`Error with ${baseUrl}:`, error);
        // Continue to next URL
      }
    }
    
    throw new Error('Failed to generate post from template');
  }
  
  // New method to regenerate the last post
  async regenerateLastPost() {
    if (!window.lastTemplateRequest) {
      console.error('No previous template request found');
      return null;
    }
    
    try {
      // Show loading
      if (window.showLoadingIndicator) {
        window.showLoadingIndicator();
      }
      
      const regeneratedPost = await this.generatePostFromTemplate(window.lastTemplateRequest, true);
      
      // Hide loading
      if (window.hideLoadingIndicator) {
        window.hideLoadingIndicator();
      }
      
      return regeneratedPost;
    } catch (error) {
      console.error('Error regenerating post:', error);
      
      // Hide loading
      if (window.hideLoadingIndicator) {
        window.hideLoadingIndicator();
      }
      
      throw error;
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Wait for LinkedInTemplates to be available
  if (window.LinkedInTemplates) {
    window.templateManager = new TemplateManager();
  } else {
    console.error('LinkedInTemplates not available');
  }
});

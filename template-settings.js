class TemplateSettings {
  constructor() {
    // DOM Elements
    this.templateList = document.getElementById('template-list');
    this.templateEditor = document.getElementById('template-editor');
    this.addTemplateBtn = document.getElementById('add-template-btn');
    this.saveTemplateBtn = document.getElementById('save-template');
    this.cancelEditBtn = document.getElementById('cancel-edit');
    this.addFieldBtn = document.getElementById('add-field');
    this.templateFields = document.getElementById('template-fields');
    this.resetTemplatesBtn = document.getElementById('reset-templates');
    
    // Form fields
    this.templateName = document.getElementById('template-name');
    this.templateDescription = document.getElementById('template-description');
    this.templateIcon = document.getElementById('template-icon');
    this.templateExamples = document.getElementById('template-examples');
    
    // State
    this.currentTemplateId = null;
    this.isEditing = false;
    this.templates = [];
    
    // Initialize
    this.initializeEventListeners();
    this.loadTemplates();
  }
  
  initializeEventListeners() {
    // Add template button
    this.addTemplateBtn.addEventListener('click', () => this.showTemplateEditor());
    
    // Save template button
    this.saveTemplateBtn.addEventListener('click', () => this.saveTemplate());
    
    // Cancel edit button
    this.cancelEditBtn.addEventListener('click', () => this.cancelEdit());
    
    // Add field button
    this.addFieldBtn.addEventListener('click', () => this.addField());
    
    // Reset templates button
    if (this.resetTemplatesBtn) {
      this.resetTemplatesBtn.addEventListener('click', () => this.resetToDefaultTemplates());
    }
  }
  
  async loadTemplates() {
    try {
      // First try to load from backend
      const response = await fetch('http://localhost:5002/templates');
      if (response.ok) {
        const backendTemplates = await response.json();
        this.templates = this.formatTemplatesFromBackend(backendTemplates);
      } else {
        // Fallback to local storage if backend fails
        const savedTemplates = await this.getSavedTemplates();
        this.templates = savedTemplates.length > 0 ? savedTemplates : this.getDefaultTemplates();
      }
      this.renderTemplateList();
    } catch (error) {
      console.error('Error loading templates:', error);
      // Fallback to local storage
      const savedTemplates = await this.getSavedTemplates();
      this.templates = savedTemplates.length > 0 ? savedTemplates : this.getDefaultTemplates();
      this.renderTemplateList();
    }
  }
  
  formatTemplatesFromBackend(backendTemplates) {
    return backendTemplates.map(template => ({
      id: template.template_id,
      name: template.template_name,
      description: template.template_style || '',
      icon: template.icon || '📝',
      recommendedDays: template.recommended_days || [],
      fields: (template.fields || []).map(field => ({
        id: field.field_id,
        name: field.field_name,
        type: field.field_type,
        required: field.required || false,
        placeholder: field.placeholder || '',
        options: field.options || []
      })),
      examples: template.examples || [],
      style: template.template_style || ''
    }));
  }
  
  async getSavedTemplates() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['templates'], (result) => {
        resolve(result.templates || []);
      });
    });
  }
  
  getDefaultTemplates() {
    // Convert the existing TEMPLATE_CATEGORIES to our format
    return Object.values(window.LinkedInTemplates?.categories || {}).map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      icon: template.icon || '📝',
      recommendedDays: template.recommendedDays || [],
      fields: template.fields || [],
      examples: [],
      style: template.style || '',
      contentTypes: template.contentTypes || []
    }));
  }
  
  renderTemplateList() {
    if (!this.templateList) return;
    
    if (this.templates.length === 0) {
      this.templateList.innerHTML = `
        <div class="empty-state">
          <p>No templates found</p>
          <button class="btn btn-primary" id="create-first-template">Create Your First Template</button>
        </div>
      `;
      
      document.getElementById('create-first-template')?.addEventListener('click', () => this.showTemplateEditor());
      return;
    }
    
    this.templateList.innerHTML = this.templates.map(template => `
      <div class="template-item" data-id="${template.id}">
        <div class="template-icon">${template.icon || '📝'}</div>
        <div class="template-info">
          <div class="template-name">${template.name}</div>
          <div class="template-description" title="${template.description}">
            ${template.description || 'No description'}
          </div>
        </div>
        <div class="template-actions">
          <button class="icon-button edit-template" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
          </button>
          <button class="icon-button delete-template" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners to template items
    document.querySelectorAll('.template-item').forEach(item => {
      const templateId = item.dataset.id;
      const template = this.templates.find(t => t.id === templateId);
      
      if (template) {
        item.addEventListener('click', (e) => {
          // Only trigger if not clicking on action buttons
          if (!e.target.closest('.template-actions')) {
            this.editTemplate(template);
          }
        });
        
        // Edit button
        item.querySelector('.edit-template')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.editTemplate(template);
        });
        
        // Delete button
        item.querySelector('.delete-template')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteTemplate(template.id);
        });
      }
    });
  }
  
  showTemplateEditor(template = null) {
    this.templateList.style.display = 'none';
    this.templateEditor.style.display = 'block';
    
    if (template) {
      // Editing existing template
      this.currentTemplateId = template.id;
      this.templateName.value = template.name || '';
      this.templateDescription.value = template.description || '';
      this.templateIcon.value = template.icon || '📝';
      
      // Clear existing fields
      this.templateFields.innerHTML = '';
      
      // Add fields
      if (template.fields && template.fields.length > 0) {
        template.fields.forEach(field => this.addField(field));
      } else {
        this.addField(); // Add one empty field by default
      }
      
      // Set examples
      if (Array.isArray(template.examples)) {
        this.templateExamples.value = template.examples.join('\n');
      } else if (typeof template.examples === 'string') {
        this.templateExamples.value = template.examples;
      } else {
        this.templateExamples.value = '';
      }
      
      // Set recommended days
      if (Array.isArray(template.recommendedDays)) {
        document.querySelectorAll('.days-selector input[type="checkbox"]').forEach(checkbox => {
          checkbox.checked = template.recommendedDays.includes(checkbox.value);
        });
      } else if (Array.isArray(template.recommended_days)) {
        // Handle backend format (recommended_days)
        document.querySelectorAll('.days-selector input[type="checkbox"]').forEach(checkbox => {
          checkbox.checked = template.recommended_days.includes(checkbox.value);
        });
      } else {
        document.querySelectorAll('.days-selector input[type="checkbox"]').forEach(cb => cb.checked = false);
      }
      
      document.getElementById('editor-title').textContent = 'Edit Template';
    } else {
      // Creating new template
      this.currentTemplateId = null;
      this.templateName.value = '';
      this.templateDescription.value = '';
      this.templateIcon.value = '📝';
      this.templateFields.innerHTML = '';
      this.templateExamples.value = '';
      document.querySelectorAll('.days-selector input[type="checkbox"]').forEach(cb => cb.checked = false);
      this.addField(); // Add one empty field by default
      document.getElementById('editor-title').textContent = 'Create New Template';
    }
  }
  
  renderFields(fields) {
    this.templateFields.innerHTML = '';
    
    if (fields.length === 0) {
      this.templateFields.innerHTML = `
        <div class="empty-state">
          <p>No fields added yet.</p>
          <p>Click "Add Field" to get started.</p>
        </div>
      `;
      return;
    }
    
    fields.forEach((field, index) => {
      const fieldId = field.id || `field-${Date.now()}-${index}`;
      const fieldElement = document.createElement('div');
      fieldElement.className = 'field-item';
      fieldElement.dataset.id = fieldId;
      
      // Create options HTML if field has options
      let optionsHtml = '';
      if (field.type === 'select' && field.options?.length > 0) {
        optionsHtml = `
          <div class="field-options">
            ${field.options.map(option => `
              <div class="field-option">
                <input type="text" value="${option}" class="form-control option-input" placeholder="Option">
                <button type="button" class="remove-option">×</button>
              </div>
            `).join('')}
            <div class="add-option">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Option
            </div>
          </div>
        `;
      }
      
      fieldElement.innerHTML = `
        <div class="field-header">
          <span>${field.name || 'New Field'}</span>
          <div class="field-actions">
            <button type="button" class="remove-field">Delete</button>
          </div>
        </div>
        <div class="field-row">
          <div>
            <label>Field Name</label>
            <input type="text" class="form-control field-name" value="${field.name || ''}" placeholder="e.g., Title, Description">
          </div>
          <div>
            <label>Field Type</label>
            <select class="form-control field-type">
              <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
              <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Text Area</option>
              <option value="select" ${field.type === 'select' ? 'selected' : ''}>Dropdown</option>
              <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
              <option value="date" ${field.type === 'date' ? 'selected' : ''}>Date</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div>
            <label>Placeholder</label>
            <input type="text" class="form-control field-placeholder" value="${field.placeholder || ''}" placeholder="e.g., Enter your text here">
          </div>
          <div class="field-required">
            <label>
              <input type="checkbox" class="field-required-checkbox" ${field.required ? 'checked' : ''}>
              Required
            </label>
          </div>
        </div>
        ${optionsHtml}
      `;
      
      this.templateFields.appendChild(fieldElement);
      
      // Add event listeners for field type change
      const typeSelect = fieldElement.querySelector('.field-type');
      if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
          this.updateFieldType(fieldElement, e.target.value);
        });
      }
      
      // Add event listener for adding options
      const addOptionBtn = fieldElement.querySelector('.add-option');
      if (addOptionBtn) {
        addOptionBtn.addEventListener('click', () => {
          this.addOption(fieldElement);
        });
      }
      
      // Add event listeners for removing options
      fieldElement.querySelectorAll('.remove-option').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.closest('.field-option').remove();
        });
      });
      
      // Add event listener for removing field
      const removeBtn = fieldElement.querySelector('.remove-field');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          fieldElement.remove();
        });
      }
    });
  }
  
  updateFieldType(fieldElement, type) {
    const optionsContainer = fieldElement.querySelector('.field-options');
    
    if (type === 'select') {
      if (!optionsContainer) {
        const optionsHtml = `
          <div class="field-options">
            <div class="field-option">
              <input type="text" class="form-control option-input" placeholder="Option">
              <button type="button" class="remove-option">×</button>
            </div>
            <div class="add-option">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Option
            </div>
          </div>
        `;
        
        fieldElement.insertAdjacentHTML('beforeend', optionsHtml);
        
        // Add event listeners for the new elements
        fieldElement.querySelector('.add-option')?.addEventListener('click', () => {
          this.addOption(fieldElement);
        });
        
        fieldElement.querySelector('.remove-option')?.addEventListener('click', (e) => {
          e.target.closest('.field-option')?.remove();
        });
      }
    } else if (optionsContainer) {
      optionsContainer.remove();
    }
  }
  
  addOption(fieldElement) {
    const optionsContainer = fieldElement.querySelector('.field-options');
    if (!optionsContainer) return;
    
    const optionId = `option-${Date.now()}`;
    const optionElement = document.createElement('div');
    optionElement.className = 'field-option';
    optionElement.innerHTML = `
      <input type="text" class="form-control option-input" placeholder="Option">
      <button type="button" class="remove-option">×</button>
    `;
    
    // Insert before the add option button
    const addOptionBtn = fieldElement.querySelector('.add-option');
    if (addOptionBtn) {
      optionsContainer.insertBefore(optionElement, addOptionBtn);
    } else {
      optionsContainer.appendChild(optionElement);
    }
    
    // Add event listener for the remove button
    optionElement.querySelector('.remove-option')?.addEventListener('click', () => {
      optionElement.remove();
    });
    
    // Focus the new input
    optionElement.querySelector('input')?.focus();
  }
  
  addField() {
    const newField = {
      id: `field-${Date.now()}`,
      name: '',
      type: 'text',
      required: false,
      placeholder: ''
    };
    
    const fields = this.getCurrentFields();
    fields.push(newField);
    this.renderFields(fields);
    
    // Scroll to the bottom to show the new field
    this.templateFields.scrollTop = this.templateFields.scrollHeight;
  }
  
  getCurrentFields() {
    const fields = [];
    
    document.querySelectorAll('.field-item').forEach(fieldElement => {
      const fieldId = fieldElement.dataset.id;
      const fieldName = fieldElement.querySelector('.field-name')?.value || 'Untitled Field';
      const fieldType = fieldElement.querySelector('.field-type')?.value || 'text';
      const fieldPlaceholder = fieldElement.querySelector('.field-placeholder')?.value || '';
      const fieldRequired = fieldElement.querySelector('.field-required-checkbox')?.checked || false;
      
      const field = {
        id: fieldId,
        name: fieldName,
        type: fieldType,
        placeholder: fieldPlaceholder,
        required: fieldRequired
      };
      
      // Get options for select fields
      if (fieldType === 'select') {
        const options = [];
        fieldElement.querySelectorAll('.field-option').forEach(optionEl => {
          const value = optionEl.querySelector('.option-input')?.value;
          if (value) {
            options.push(value);
          }
        });
        
        if (options.length > 0) {
          field.options = options;
        }
      }
      
      fields.push(field);
    });
    
    return fields;
  }
  
  async saveTemplate() {
    try {
      const name = this.templateName.value.trim();
      const description = this.templateDescription.value.trim();
      const icon = this.templateIcon.value.trim() || '📝';
      const fields = this.getCurrentFields();
      
      // Get selected days
      const recommendedDays = [];
      document.querySelectorAll('.days-selector input[type="checkbox"]:checked').forEach(checkbox => {
        recommendedDays.push(checkbox.value);
      });
      
      // Get example posts
      const examples = this.templateExamples.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (!name) {
        alert('Please enter a template name');
        return;
      }
      
      // Prepare the template data with proper field names for the backend
      const templateIdForPayload = this.currentTemplateId || `custom-${Date.now()}`;
      const templateData = {
        template_id: templateIdForPayload, // Ensures template_id is always in the payload
        template_name: name,
        template_style: description,
        icon: icon,
        recommended_days: recommendedDays,
        fields: fields.map(field => ({
          // field_id should be the actual ID if it exists, or null/undefined for new fields in a new template
          // The backend create/update logic for fields handles new vs existing based on what's provided.
          // For simplicity here, we send the frontend-generated field.id as field_id.
          // Backend expects field_id, field_name etc.
          field_id: field.id, 
          field_name: field.name,
          field_type: field.type,
          required: field.required || false,
          placeholder: field.placeholder || '',
          options: field.options || []
        })),
        examples: examples
      };
      
      // Save to backend
      const method = this.currentTemplateId ? 'PUT' : 'POST';
      const url = this.currentTemplateId 
        ? `http://localhost:5002/templates/${this.currentTemplateId}`
        : 'http://localhost:5002/templates';
      
      console.log('Saving template data:', templateData); // Debug log
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from server:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Reload templates from backend
      await this.loadTemplates();
      this.cancelEdit();
      
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template: ' + error.message);
    }
  }
  
  async saveTemplates() {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ templates: this.templates }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving templates:', chrome.runtime.lastError);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  editTemplate(template) {
    this.showTemplateEditor(template);
  }
  
  async deleteTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5002/templates/${templateId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Reload templates from backend
      await this.loadTemplates();
      
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template: ' + error.message);
    }
  }
  
  cancelEdit() {
    this.templateList.style.display = 'block';
    this.templateEditor.style.display = 'none';
    this.currentTemplateId = null;
    this.isEditing = false;
  }
  
  async resetToDefaultTemplates() {
    if (!confirm('Are you sure you want to reset all templates to default? This will remove any custom templates you have created.')) {
      return;
    }
    
    this.templates = this.getDefaultTemplates();
    await this.saveTemplates();
    this.renderTemplateList();
  }
  
  generateId() {
    return `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait for LinkedInTemplates to be available
  if (window.LinkedInTemplates) {
    window.templateSettings = new TemplateSettings();
  } else {
    // If LinkedInTemplates isn't loaded yet, wait for it
    const checkTemplates = setInterval(() => {
      if (window.LinkedInTemplates) {
        clearInterval(checkTemplates);
        window.templateSettings = new TemplateSettings();
      }
    }, 100);
  }
});

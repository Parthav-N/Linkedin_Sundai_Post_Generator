// templates.js - Template definitions for LinkedIn post generation

// Template categories as defined in requirements
const TEMPLATE_CATEGORIES = {
  BIG_SHOTS: {
    id: 'big-shots',
    name: 'Big Shots',
    description: 'High-impact flagship announcements',
    recommendedDays: ['Thursday', 'Tuesday'],
    contentTypes: ['Major product launch', 'Podcast release', 'Flagship initiative', 'Industry breakthrough'],
    fields: [
      {
        id: 'content-type',
        name: 'Content Type',
        type: 'select',
        options: ['Major product launch', 'Podcast release', 'Flagship initiative', 'Industry breakthrough'],
        required: true
      },
      {
        id: 'brief-description',
        name: 'Brief Description',
        type: 'text',
        maxLength: 50,
        placeholder: 'Describe your announcement in 50 characters or less',
        required: true
      },
      {
        id: 'link',
        name: 'Link (Optional)',
        type: 'text',
        placeholder: 'https://...',
        required: false
      }
    ],
    style: 'Bold, confident, attention-grabbing with strong call-to-action',
    icon: '🚀'
  },
  
  WORKSHOPS: {
    id: 'workshops',
    name: 'Workshops',
    description: 'Educational and collaborative event promotion',
    recommendedDays: ['Thursday', 'Tuesday'],
    contentTypes: ['Educational event', 'University partnership', 'Industry collaboration', 'Training session'],
    fields: [
      {
        id: 'event-name',
        name: 'Event Name',
        type: 'text',
        placeholder: 'Name of your workshop or event',
        required: true
      },
      {
        id: 'date-time',
        name: 'Date & Time',
        type: 'text',
        placeholder: 'e.g., June 15, 2025 at 2:00 PM EST',
        required: true
      },
      {
        id: 'location-format',
        name: 'Location/Format',
        type: 'select',
        options: ['Virtual (Zoom)', 'Virtual (Teams)', 'Virtual (Other)', 'In-person', 'Hybrid'],
        required: true
      },
      {
        id: 'target-audience',
        name: 'Target Audience',
        type: 'text',
        placeholder: 'Who should attend this event?',
        required: true
      }
    ],
    style: 'Engaging, educational, community-focused with clear event details',
    icon: '🎓'
  },
  
  FULL_ANNOUNCEMENTS: {
    id: 'full-announcements',
    name: 'Full Announcements',
    description: 'Major coordinated news and product releases',
    recommendedDays: ['Wednesday'],
    contentTypes: ['Significant update', 'Coordinated campaign', 'Major news', 'Strategic partnership'],
    fields: [
      {
        id: 'announcement-type',
        name: 'Announcement Type',
        type: 'select',
        options: ['Significant update', 'Coordinated campaign', 'Major news', 'Strategic partnership'],
        required: true
      },
      {
        id: 'what',
        name: 'What',
        type: 'text',
        placeholder: 'What are you announcing?',
        required: true
      },
      {
        id: 'when',
        name: 'When',
        type: 'text',
        placeholder: 'When is it happening?',
        required: true
      },
      {
        id: 'why',
        name: 'Why',
        type: 'text',
        placeholder: 'Why is this important?',
        required: true
      },
      {
        id: 'desired-action',
        name: 'Desired Action',
        type: 'text',
        placeholder: 'What should readers do?',
        required: true
      }
    ],
    style: 'Comprehensive, professional, newsworthy with structured information',
    icon: '📢'
  },
  
  HACKS_PRODUCTS: {
    id: 'hacks-products',
    name: 'Hacks & Products',
    description: 'Technical content and niche product showcases',
    recommendedDays: ['Monday', 'Friday', 'Saturday', 'Sunday'],
    contentTypes: ['Cybersecurity tool', 'Technical innovation', 'Specialized product', 'Industry hack'],
    fields: [
      {
        id: 'product-category',
        name: 'Product Category',
        type: 'select',
        options: ['Cybersecurity tool', 'Technical innovation', 'Specialized product', 'Industry hack'],
        required: true
      },
      {
        id: 'technical-highlights',
        name: 'Technical Highlights',
        type: 'textarea',
        placeholder: 'Key technical features or innovations',
        required: true
      },
      {
        id: 'audience-level',
        name: 'Target Audience Level',
        type: 'select',
        options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
        required: true
      }
    ],
    style: 'Technical credibility with accessible language and relevant expertise signals',
    icon: '⚙️'
  }
};

// Tone options for post generation
const TONE_OPTIONS = [
  { id: 'professional', name: 'Professional', description: 'Formal and business-appropriate' },
  { id: 'conversational', name: 'Conversational', description: 'Friendly and approachable' },
  { id: 'enthusiastic', name: 'Enthusiastic', description: 'Energetic and passionate' },
  { id: 'authoritative', name: 'Authoritative', description: 'Expert and confident' },
  { id: 'thoughtful', name: 'Thoughtful', description: 'Reflective and insightful' }
];

// Length options for post generation
const LENGTH_OPTIONS = [
  { id: 'concise', name: 'Concise', description: '1-2 paragraphs' },
  { id: 'standard', name: 'Standard', description: '3-4 paragraphs' },
  { id: 'detailed', name: 'Detailed', description: '5+ paragraphs' }
];

// Function to get today's recommended templates
function getTodayRecommendedTemplates() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  
  return Object.values(TEMPLATE_CATEGORIES).filter(template => 
    template.recommendedDays.includes(today)
  );
}

// Function to get all templates
function getAllTemplates() {
  return Object.values(TEMPLATE_CATEGORIES);
}

// Function to get template by ID
function getTemplateById(id) {
  return Object.values(TEMPLATE_CATEGORIES).find(template => template.id === id);
}

// Export the template data and functions
window.LinkedInTemplates = {
  categories: TEMPLATE_CATEGORIES,
  tones: TONE_OPTIONS,
  lengths: LENGTH_OPTIONS,
  getTodayRecommendedTemplates,
  getAllTemplates,
  getTemplateById
};

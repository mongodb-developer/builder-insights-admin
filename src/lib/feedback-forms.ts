/**
 * Builder Insights - Feedback Forms
 * 
 * Templates, slug generation, and form-to-insight mapping utilities.
 */

import { ObjectId } from 'mongodb';
import type {
  FeedbackFormTemplate,
  FeedbackQuestion,
  FeedbackFormSettings,
  FeedbackResponseAnswer,
  InsightType,
  ProductArea,
  Sentiment,
  Priority,
} from '@/types';

// ============================================================================
// SLUG GENERATION
// ============================================================================

/**
 * Generate a URL-friendly slug from a title, with a random suffix for uniqueness.
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

// ============================================================================
// QUESTION ID GENERATION
// ============================================================================

export function generateQuestionId(): string {
  return new ObjectId().toString();
}

// ============================================================================
// FORM TEMPLATES
// ============================================================================

export interface FormTemplate {
  id: FeedbackFormTemplate;
  name: string;
  description: string;
  defaultTitle: string;
  defaultDescription: string;
  questions: Omit<FeedbackQuestion, '_id'>[];
  defaultSettings: FeedbackFormSettings;
}

export const FORM_TEMPLATES: Record<FeedbackFormTemplate, FormTemplate> = {
  session_feedback: {
    id: 'session_feedback',
    name: 'Session Feedback',
    description: 'Collect feedback after a talk, workshop, or presentation',
    defaultTitle: 'Session Feedback',
    defaultDescription: 'We\'d love to hear your thoughts on this session. Your feedback helps us improve future events.',
    questions: [
      {
        order: 1,
        type: 'rating',
        label: 'How would you rate this session overall?',
        description: '1 = Poor, 5 = Excellent',
        required: true,
        mapsToInsightField: '_rating',
      },
      {
        order: 2,
        type: 'free_text',
        label: 'What did you find most valuable?',
        required: true,
        mapsToInsightField: 'text',
      },
      {
        order: 3,
        type: 'product_area',
        label: 'Which MongoDB products are you interested in?',
        required: false,
        mapsToInsightField: 'productAreas',
      },
      {
        order: 4,
        type: 'free_text',
        label: 'What challenges are you currently facing?',
        required: false,
        mapsToInsightField: '_challenges',
      },
      {
        order: 5,
        type: 'free_text',
        label: 'Any feature requests or suggestions?',
        required: false,
        mapsToInsightField: '_suggestions',
      },
      {
        order: 6,
        type: 'sentiment',
        label: 'How would you describe your overall experience with MongoDB?',
        required: true,
        mapsToInsightField: 'sentiment',
      },
    ],
    defaultSettings: {
      collectName: true,
      collectEmail: true,
      maxResponses: null,
      closesAt: null,
      thankYouMessage: 'Thank you for your feedback! Your input helps us build better developer experiences.',
    },
  },

  product_feedback: {
    id: 'product_feedback',
    name: 'Product Feedback',
    description: 'Gather product-specific feedback from developers',
    defaultTitle: 'MongoDB Product Feedback',
    defaultDescription: 'Share your experience with MongoDB products. Your feedback directly influences our roadmap.',
    questions: [
      {
        order: 1,
        type: 'product_area',
        label: 'Which MongoDB product(s) are you using?',
        required: true,
        mapsToInsightField: 'productAreas',
      },
      {
        order: 2,
        type: 'insight_type',
        label: 'What type of feedback do you have?',
        required: true,
        mapsToInsightField: 'type',
      },
      {
        order: 3,
        type: 'free_text',
        label: 'Tell us more about your feedback',
        description: 'Please be as specific as possible',
        required: true,
        mapsToInsightField: 'text',
      },
      {
        order: 4,
        type: 'priority',
        label: 'How critical is this to your work?',
        required: true,
        mapsToInsightField: 'priority',
      },
      {
        order: 5,
        type: 'free_text',
        label: 'What are you building?',
        description: 'Help us understand your use case',
        required: false,
        mapsToInsightField: '_useCase',
      },
    ],
    defaultSettings: {
      collectName: true,
      collectEmail: true,
      maxResponses: null,
      closesAt: null,
      thankYouMessage: 'Thank you for sharing your product feedback! Our team reviews every submission.',
    },
  },

  general_feedback: {
    id: 'general_feedback',
    name: 'General Developer Feedback',
    description: 'Broad community pulse check for events and meetups',
    defaultTitle: 'Developer Feedback',
    defaultDescription: 'Tell us about your experience with MongoDB. We\'re always looking to improve.',
    questions: [
      {
        order: 1,
        type: 'free_text',
        label: 'What are you building with MongoDB?',
        required: false,
        mapsToInsightField: '_useCase',
      },
      {
        order: 2,
        type: 'product_area',
        label: 'Which MongoDB products do you use?',
        required: false,
        mapsToInsightField: 'productAreas',
      },
      {
        order: 3,
        type: 'free_text',
        label: 'What is your biggest challenge with MongoDB?',
        required: true,
        mapsToInsightField: 'text',
      },
      {
        order: 4,
        type: 'insight_type',
        label: 'What type of feedback is this?',
        required: true,
        mapsToInsightField: 'type',
      },
      {
        order: 5,
        type: 'sentiment',
        label: 'How would you rate your overall experience with MongoDB?',
        required: true,
        mapsToInsightField: 'sentiment',
      },
    ],
    defaultSettings: {
      collectName: true,
      collectEmail: true,
      maxResponses: null,
      closesAt: null,
      thankYouMessage: 'Thank you for your feedback! Your insights help shape the future of MongoDB.',
    },
  },
};

/**
 * Create a full set of questions from a template, with generated IDs.
 */
export function createQuestionsFromTemplate(template: FeedbackFormTemplate): FeedbackQuestion[] {
  const tmpl = FORM_TEMPLATES[template];
  return tmpl.questions.map((q) => ({
    ...q,
    _id: generateQuestionId(),
  }));
}

// ============================================================================
// RESPONSE → INSIGHT MAPPING
// ============================================================================

/**
 * Valid insight types from the type system
 */
const VALID_INSIGHT_TYPES: InsightType[] = [
  'Pain Point', 'Feature Request', 'Praise', 'Question',
  'Use Case', 'Competition', 'Documentation', 'Other',
];

const VALID_SENTIMENTS: Sentiment[] = ['Positive', 'Neutral', 'Negative'];
const VALID_PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

/**
 * Convert a rating (1-5) to a priority value.
 * 1-2 → maps to negative sentiment context (Low priority from user perspective)
 * 3 → Medium
 * 4-5 → High (user is passionate about this)
 */
function ratingToPriority(rating: number): Priority {
  if (rating <= 2) return 'Low';
  if (rating === 3) return 'Medium';
  return 'High';
}

/**
 * Convert a rating (1-5) to a sentiment hint.
 */
function ratingToSentiment(rating: number): Sentiment {
  if (rating <= 2) return 'Negative';
  if (rating === 3) return 'Neutral';
  return 'Positive';
}

export interface MappedInsightData {
  text: string;
  type: InsightType;
  sentiment: Sentiment;
  priority: Priority;
  productAreas: ProductArea[];
  tags: string[];
}

/**
 * Map form response answers to Insight fields using question definitions.
 */
export function mapResponsesToInsightData(
  questions: FeedbackQuestion[],
  answers: FeedbackResponseAnswer[]
): MappedInsightData {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]));

  let text = '';
  let type: InsightType = 'Other';
  let sentiment: Sentiment = 'Neutral';
  let priority: Priority = 'Medium';
  let productAreas: ProductArea[] = [];
  const tags: string[] = [];
  const textParts: string[] = [];

  for (const question of questions.sort((a, b) => a.order - b.order)) {
    const answer = answerMap.get(question._id);
    if (answer === undefined || answer === null || answer === '') continue;

    const field = question.mapsToInsightField;

    switch (field) {
      case 'text':
        textParts.unshift(String(answer));
        break;

      case '_challenges':
      case '_suggestions':
      case '_useCase': {
        const label = field === '_challenges'
          ? 'Challenges'
          : field === '_suggestions'
            ? 'Suggestions'
            : 'Use Case';
        textParts.push(`[${label}] ${String(answer)}`);
        break;
      }

      case '_rating': {
        const rating = typeof answer === 'number' ? answer : parseInt(String(answer), 10);
        if (!isNaN(rating)) {
          // Use rating as a hint for priority and sentiment if not explicitly set
          priority = ratingToPriority(rating);
          sentiment = ratingToSentiment(rating);
          tags.push(`rating:${rating}/5`);
        }
        break;
      }

      case 'type': {
        const val = String(answer);
        if (VALID_INSIGHT_TYPES.includes(val as InsightType)) {
          type = val as InsightType;
        }
        break;
      }

      case 'sentiment': {
        const val = String(answer);
        if (VALID_SENTIMENTS.includes(val as Sentiment)) {
          sentiment = val as Sentiment;
        }
        break;
      }

      case 'priority': {
        const val = String(answer);
        if (VALID_PRIORITIES.includes(val as Priority)) {
          priority = val as Priority;
        }
        break;
      }

      case 'productAreas': {
        const areas = Array.isArray(answer) ? answer : [String(answer)];
        productAreas = areas as ProductArea[];
        break;
      }

      default: {
        // Unmapped questions — include in text with the question label
        if (question.type === 'free_text' && String(answer).trim()) {
          textParts.push(`[${question.label}] ${String(answer)}`);
        } else if (question.type === 'rating') {
          tags.push(`${question.label}: ${answer}/5`);
        } else if (answer) {
          const displayValue = Array.isArray(answer) ? answer.join(', ') : String(answer);
          tags.push(`${question.label}: ${displayValue}`);
        }
        break;
      }
    }
  }

  text = textParts.filter(Boolean).join('\n\n');
  if (!text) {
    text = 'Feedback submitted via form';
  }

  return { text, type, sentiment, priority, productAreas, tags };
}

// ============================================================================
// PRODUCT AREA OPTIONS (reused in form rendering)
// ============================================================================

export const PRODUCT_AREA_OPTIONS: ProductArea[] = [
  'Atlas',
  'Atlas Search',
  'Atlas Vector Search',
  'Atlas Stream Processing',
  'Atlas Data Federation',
  'Atlas Device Sync',
  'Charts',
  'Compass',
  'Driver',
  'Server',
  'Aggregation',
  'Atlas Triggers',
  'Atlas Functions',
  'Data API',
  'App Services',
  'Other',
];

export const INSIGHT_TYPE_OPTIONS: InsightType[] = [
  'Pain Point',
  'Feature Request',
  'Praise',
  'Question',
  'Use Case',
  'Competition',
  'Documentation',
  'Other',
];

export const SENTIMENT_OPTIONS: Sentiment[] = ['Positive', 'Neutral', 'Negative'];
export const PRIORITY_OPTIONS: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

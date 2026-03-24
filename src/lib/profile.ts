/**
 * Profile completeness evaluation utilities.
 *
 * Each field carries a weight.  The completeness percentage is
 * sum(weight of filled fields) / sum(all weights).
 *
 * Fields are split into "required" (high weight) and "optional" (lower weight)
 * so that core contact info dominates the score.
 */

import { Advocate } from '@/types';

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

export interface ProfileField {
  key: keyof Advocate;
  label: string;
  weight: number;
  required: boolean;           // "required" here means strongly encouraged
  placeholder?: string;
  helperText?: string;
  type?: 'text' | 'url' | 'tel' | 'textarea' | 'select';
  validate?: (value: string) => string | null; // returns error or null
}

export const PROFILE_FIELDS: ProfileField[] = [
  {
    key: 'name',
    label: 'Full Name',
    weight: 15,
    required: true,
    placeholder: 'Jane Doe',
    type: 'text',
  },
  {
    key: 'email',
    label: 'Email',
    weight: 15,
    required: true,
    placeholder: 'jane.doe@mongodb.com',
    type: 'text',
  },
  {
    key: 'title',
    label: 'Job Title',
    weight: 10,
    required: true,
    placeholder: 'Senior Developer Advocate',
    type: 'text',
  },
  {
    key: 'linkedinUrl',
    label: 'LinkedIn Profile URL',
    weight: 15,
    required: true,
    placeholder: 'https://linkedin.com/in/janedoe',
    type: 'url',
    helperText: 'Your public LinkedIn profile URL',
    validate: (v: string) => {
      if (v && !/^https?:\/\/(www\.)?linkedin\.com\/in\/.+/i.test(v)) {
        return 'Must be a valid LinkedIn profile URL (e.g. https://linkedin.com/in/yourname)';
      }
      return null;
    },
  },
  {
    key: 'phone',
    label: 'Phone Number',
    weight: 10,
    required: true,
    placeholder: '+1 (555) 123-4567',
    type: 'tel',
    helperText: 'Used for event coordination only',
  },
  {
    key: 'region',
    label: 'Region',
    weight: 10,
    required: true,
    type: 'select',
    helperText: 'Your primary geographic region',
  },
  {
    key: 'location',
    label: 'Location',
    weight: 5,
    required: false,
    placeholder: 'New York, NY',
    type: 'text',
    helperText: 'City and state/country',
  },
  {
    key: 'bio',
    label: 'Bio',
    weight: 5,
    required: false,
    placeholder: 'Tell us a bit about yourself and your expertise...',
    type: 'textarea',
    helperText: 'A short description visible to the team',
  },
  {
    key: 'timezone',
    label: 'Timezone',
    weight: 5,
    required: false,
    placeholder: 'America/New_York',
    type: 'select',
    helperText: 'Helps with scheduling across regions',
  },
  {
    key: 'github',
    label: 'GitHub',
    weight: 5,
    required: false,
    placeholder: 'https://github.com/janedoe',
    type: 'url',
    helperText: 'GitHub profile URL or username',
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    weight: 5,
    required: false,
    placeholder: 'https://twitter.com/janedoe',
    type: 'url',
    helperText: 'Twitter or X profile URL',
  },
];

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export interface ProfileCompletenessResult {
  /** 0-100 integer percentage */
  percentage: number;
  /** Fields that are missing or empty */
  missingFields: ProfileField[];
  /** Fields that are filled */
  completedFields: ProfileField[];
  /** True when percentage >= threshold */
  isComplete: boolean;
}

/** Threshold percentage at which we consider the profile "complete enough" */
export const PROFILE_COMPLETE_THRESHOLD = 80;

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function evaluateProfileCompleteness(
  advocate: Partial<Advocate>,
): ProfileCompletenessResult {
  const totalWeight = PROFILE_FIELDS.reduce((sum, f) => sum + f.weight, 0);
  let filledWeight = 0;

  const missingFields: ProfileField[] = [];
  const completedFields: ProfileField[] = [];

  for (const field of PROFILE_FIELDS) {
    const value = advocate[field.key];
    if (isFilled(value)) {
      filledWeight += field.weight;
      completedFields.push(field);
    } else {
      missingFields.push(field);
    }
  }

  const percentage = Math.round((filledWeight / totalWeight) * 100);

  return {
    percentage,
    missingFields,
    completedFields,
    isComplete: percentage >= PROFILE_COMPLETE_THRESHOLD,
  };
}

// ---------------------------------------------------------------------------
// Allowed update keys (prevent users from self-promoting, etc.)
// ---------------------------------------------------------------------------

/** Fields a user may update on their own profile */
export const SELF_EDITABLE_FIELDS: (keyof Advocate)[] = [
  'name',
  'title',
  'linkedinUrl',
  'phone',
  'bio',
  'location',
  'timezone',
  'github',
  'twitter',
  'avatarUrl',
  'region',
];

/**
 * Strip any fields the user should not be able to set on themselves.
 * Returns a sanitized update object.
 */
export function sanitizeProfileUpdate(
  body: Record<string, unknown>,
): Partial<Advocate> {
  const clean: Record<string, unknown> = {};
  for (const key of SELF_EDITABLE_FIELDS) {
    if (key in body) {
      clean[key] = body[key];
    }
  }
  return clean as Partial<Advocate>;
}

import type { OnboardingStepId } from '../types/experience-block';

export const ONBOARDING_STEPS: OnboardingStepId[] = [
  'welcome',
  'create_tree',
  'add_person',
  'upload_photo',
  'invite_family',
  'complete',
];

export const ONBOARDING_STEP_LABELS: Record<OnboardingStepId, string> = {
  welcome: 'onboarding.steps.welcome',
  create_tree: 'onboarding.steps.createTree',
  add_person: 'onboarding.steps.addPerson',
  upload_photo: 'onboarding.steps.uploadPhoto',
  invite_family: 'onboarding.steps.inviteFamily',
  complete: 'onboarding.steps.complete',
};

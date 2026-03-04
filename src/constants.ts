export const ViewId = {
  MAIN: 'mainView',
  EDITOR: 'setEditorView',
  STUDY_SETUP: 'studySetupView',
  STUDY: 'studyView',
  RESULTS: 'resultsView',
  SETTINGS: 'settingsView',
} as const;

export type ViewIdValue = (typeof ViewId)[keyof typeof ViewId];

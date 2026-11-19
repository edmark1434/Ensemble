export interface ProjectSaveSummary {
  id: string;
  previewUrl: string;
  isInitial: boolean;
  createdAt: string;
}

export interface ProjectSavesPage {
  saves: ProjectSaveSummary[];
  hasMore: boolean;
}

// Fired after this tab creates a save, so an open Saves panel refreshes.
export const PROJECT_SAVES_UPDATED_EVENT = "project-saves-updated";

// One explicit save: the project document and its scene documents, captured together.
export interface ProjectSaveSummary {
  id: string;
  createdAt: string;
  createdBy: { name: string; avatarUrl: string | null } | null;
}

export interface ProjectSavesPage {
  saves: ProjectSaveSummary[];
  hasMore: boolean;
}

// Fired after this tab creates a save, so an open Saves panel refreshes.
export const PROJECT_SAVES_UPDATED_EVENT = "project-saves-updated";

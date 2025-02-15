"use client";

import React from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface OutputMetadata {
  template?: string;
  userPrompt?: string;
  uploadedImages?: string[];
  timestamp?: number;
  projectDir?: string;
  versionDir?: string;
}

interface Version extends OutputMetadata {
  versionDir: string;
}

interface Project {
  projectDir: string;
  versions: Version[];
}

interface PastOutputsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectOutput: (output: OutputMetadata) => void;
  onRestoreSession: (projectDir: string) => void;
  projects?: Project[];
}

export function PastOutputsDrawer({
  open,
  onOpenChange,
  onSelectOutput,
  onRestoreSession,
  projects = [],
}: PastOutputsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left">
        <SheetTitle>過去のプロジェクト一覧</SheetTitle>
        <div className="space-y-4 mt-4">
          {projects.map((project) => (
            <div key={project.projectDir} className="space-y-2">
              <button
                onClick={() => onRestoreSession(project.projectDir)}
                className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="font-medium text-sm">
                  {project.projectDir}
                </div>
                {project.versions[0]?.timestamp && (
                  <div className="text-sm text-muted-foreground">
                    {new Date(project.versions[0].timestamp).toLocaleString()}
                  </div>
                )}
                {project.versions[0]?.userPrompt && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {project.versions[0].userPrompt}
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

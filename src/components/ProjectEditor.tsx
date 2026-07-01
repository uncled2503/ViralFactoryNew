/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { Project } from '../types';
import { Editor } from './editor/Editor';
import { CanvasSettings, EditorLayer } from './editor/types';

interface ProjectEditorProps {
  projectId: string;
}

export const ProjectEditor: React.FC<ProjectEditorProps> = ({ projectId }) => {
  const { projects, updateProject, showToast } = useApp();
  const { navigate } = useRouter();

  // Find the current project
  const project = projects.find((p) => p.id === projectId);

  // Sync state once project is loaded
  const [localProject, setLocalProject] = useState<Project | null>(null);

  useEffect(() => {
    if (project) {
      setLocalProject(project);
    }
  }, [project]);

  if (!localProject) {
    return (
      <div className="min-h-screen bg-[#03050a] flex items-center justify-center text-gray-400">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono font-bold uppercase tracking-wider">Carregando Projeto...</p>
        </div>
      </div>
    );
  }

  // Handle saving the visual project JSON back to Supabase / AppContext
  const handleSaveProjectData = (saveObj: { canvas: CanvasSettings; layers: EditorLayer[]; totalDuration: number }) => {
    try {
      const updatedProj: Project = {
        ...localProject,
        updatedAt: new Date().toISOString(),
        variables: {
          ...localProject.variables,
          layers: saveObj.layers,
          canvas: saveObj.canvas,
          // Sync primary fields for backwards compatibility with list views
          title: saveObj.layers.find(l => l.type === 'headline')?.text || localProject.variables.title,
          brandColor: saveObj.layers.find(l => l.type === 'progressBar')?.color || localProject.variables.brandColor,
          fontName: saveObj.layers.find(l => l.type === 'headline')?.font || localProject.variables.fontName
        }
      };

      updateProject(updatedProj);
    } catch (err) {
      console.error('Falha ao salvar o layout do projeto no Supabase:', err);
      showToast('Erro ao sincronizar com o Supabase. Salvamento local persistido.', 'error');
    }
  };

  return (
    <Editor
      projectId={localProject.id}
      projectName={localProject.name}
      onClose={() => navigate('/projects')}
      onSaveProjectData={handleSaveProjectData}
    />
  );
};

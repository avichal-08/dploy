CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_deployments_project_id ON deployments(project_id);

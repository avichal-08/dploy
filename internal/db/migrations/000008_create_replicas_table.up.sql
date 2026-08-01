CREATE TABLE IF NOT EXISTS replicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    container_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'starting',
    internal_port INTEGER,
    restart_count INTEGER NOT NULL DEFAULT 0,
    last_crash_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_replicas_status_deployment ON replicas(deployment_id, status);
CREATE INDEX idx_replicas_project_status ON replicas(project_id, status);

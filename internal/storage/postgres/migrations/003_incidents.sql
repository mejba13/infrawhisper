CREATE TABLE IF NOT EXISTS incidents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cluster_id      UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    severity        TEXT NOT NULL DEFAULT 'warning',
    status          TEXT NOT NULL DEFAULT 'open',
    root_cause      TEXT,
    ai_summary      TEXT,
    signals         JSONB NOT NULL DEFAULT '{}',
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_cluster ON incidents(cluster_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);

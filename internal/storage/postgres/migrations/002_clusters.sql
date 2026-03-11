CREATE TABLE IF NOT EXISTS clusters (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    provider        TEXT NOT NULL,
    region          TEXT NOT NULL,
    k8s_version     TEXT,
    endpoint        TEXT,
    agent_token     TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    node_count      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clusters_tenant ON clusters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clusters_status ON clusters(status);

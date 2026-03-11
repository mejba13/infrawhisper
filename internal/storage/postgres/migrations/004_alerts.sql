CREATE TABLE IF NOT EXISTS alert_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cluster_id      UUID REFERENCES clusters(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    condition       JSONB NOT NULL DEFAULT '{}',
    severity        TEXT NOT NULL DEFAULT 'warning',
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    channels        JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id         UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    cluster_id      UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    state           TEXT NOT NULL,
    value           FLOAT8,
    fired_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_tenant ON alert_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_rule ON alert_events(rule_id);

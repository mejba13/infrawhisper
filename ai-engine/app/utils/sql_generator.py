import re

VALID_TABLES = frozenset({"metrics", "logs", "traces", "costs"})
_SAFE_IDENTIFIER = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_\.]*$')


def validate_identifier(value: str, name: str = "value") -> str:
    if not _SAFE_IDENTIFIER.match(value):
        raise ValueError(f"Unsafe SQL identifier for {name}: {value!r}")
    return value


def validate_table(table: str) -> str:
    if table not in VALID_TABLES:
        raise ValueError(f"Unknown table: {table!r}. Must be one of {VALID_TABLES}")
    return table


def build_time_filter(hours: int) -> str:
    if not 1 <= hours <= 168:
        raise ValueError(f"hours must be 1-168, got {hours}")
    return f"timestamp >= now() - INTERVAL {hours} HOUR"


def sanitize_sql(sql: str) -> str:
    sql_upper = sql.upper().strip()
    dangerous = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE", "TRUNCATE", "GRANT", "REVOKE"]
    for keyword in dangerous:
        if re.search(rf'\b{keyword}\b', sql_upper):
            raise ValueError(f"Dangerous SQL keyword detected: {keyword}")
    return sql

from __future__ import annotations

import re
from functools import lru_cache
from typing import Any, Iterable, Sequence

from psycopg import connect, sql
from psycopg.rows import dict_row

from server.app.config import settings

_SAFE_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def is_database_configured() -> bool:
    return bool(settings.database_url.strip())


def _require_database_url() -> str:
    database_url = settings.database_url.strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured")
    return database_url


def _connection_kwargs() -> dict[str, Any]:
    kwargs: dict[str, Any] = {"row_factory": dict_row}
    if settings.database_ssl:
        kwargs["sslmode"] = "require"
    return kwargs


def _table_identifier(table_name: str):
    safe_table = table_name.strip()
    if not _SAFE_IDENTIFIER_RE.fullmatch(safe_table):
        raise ValueError(f"Unsafe table name: {table_name}")
    return sql.Identifier("public", safe_table)


def fetch_all(query: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
    with connect(_require_database_url(), **_connection_kwargs()) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or ())
            rows = cur.fetchall()
            return [dict(row) for row in rows]


def fetch_one(query: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
    with connect(_require_database_url(), **_connection_kwargs()) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or ())
            row = cur.fetchone()
            return dict(row) if row else None


def execute(query: str, params: Sequence[Any] | None = None) -> None:
    with connect(_require_database_url(), **_connection_kwargs()) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or ())
        conn.commit()


@lru_cache(maxsize=64)
def table_exists(table_name: str) -> bool:
    row = fetch_one(
        """
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = %s
        ) as present
        """,
        (table_name,),
    )
    return bool(row and row.get("present"))


def clear_table_cache() -> None:
    table_exists.cache_clear()


def select_records(
    table_name: str,
    *,
    status: str | None = None,
    order_by: str = "created_at",
    descending: bool = True,
) -> list[dict[str, Any]]:
    if not _SAFE_IDENTIFIER_RE.fullmatch(order_by):
        raise ValueError(f"Unsafe order_by: {order_by}")

    statement = sql.SQL("select * from {}").format(_table_identifier(table_name))
    params: list[Any] = []
    if status:
        statement += sql.SQL(" where {} = {}").format(sql.Identifier("status"), sql.Placeholder())
        params.append(status)

    statement += sql.SQL(" order by {} {}").format(
        sql.Identifier(order_by),
        sql.SQL("desc" if descending else "asc"),
    )

    with connect(_require_database_url(), **_connection_kwargs()) as conn:
        with conn.cursor() as cur:
            cur.execute(statement, params)
            rows = cur.fetchall()
            return [dict(row) for row in rows]


def count_records(table_name: str, *, status: str | None = None) -> int:
    statement = sql.SQL("select count(*) as total from {}").format(_table_identifier(table_name))
    params: list[Any] = []
    if status:
        statement += sql.SQL(" where {} = {}").format(sql.Identifier("status"), sql.Placeholder())
        params.append(status)

    with connect(_require_database_url(), **_connection_kwargs()) as conn:
        with conn.cursor() as cur:
            cur.execute(statement, params)
            row = cur.fetchone()
            return int((row or {}).get("total") or 0)


def insert_record(table_name: str, data: dict[str, Any]) -> list[dict[str, Any]]:
    payload = {key: value for key, value in data.items()}
    if not payload:
        raise ValueError("Insert payload cannot be empty")

    columns = [key for key in payload.keys() if _SAFE_IDENTIFIER_RE.fullmatch(key)]
    if len(columns) != len(payload):
        raise ValueError("Insert payload contains unsafe columns")

    values = [payload[column] for column in columns]
    statement = sql.SQL("insert into {} ({}) values ({}) returning *").format(
        _table_identifier(table_name),
        sql.SQL(", ").join(sql.Identifier(column) for column in columns),
        sql.SQL(", ").join(sql.Placeholder() for _ in columns),
    )

    with connect(_require_database_url(), **_connection_kwargs()) as conn:
        with conn.cursor() as cur:
            cur.execute(statement, values)
            rows = cur.fetchall()
        conn.commit()
        return [dict(row) for row in rows]


def update_record_by_id(table_name: str, record_id: str, data: dict[str, Any]) -> list[dict[str, Any]]:
    payload = {key: value for key, value in data.items()}
    if not payload:
        return []

    columns = [key for key in payload.keys() if _SAFE_IDENTIFIER_RE.fullmatch(key)]
    if len(columns) != len(payload):
        raise ValueError("Update payload contains unsafe columns")

    assignments = [
        sql.SQL("{} = {}").format(sql.Identifier(column), sql.Placeholder())
        for column in columns
    ]
    values = [payload[column] for column in columns]
    values.append(record_id)

    statement = sql.SQL("update {} set {} where id = {} returning *").format(
        _table_identifier(table_name),
        sql.SQL(", ").join(assignments),
        sql.Placeholder(),
    )

    with connect(_require_database_url(), **_connection_kwargs()) as conn:
        with conn.cursor() as cur:
            cur.execute(statement, values)
            rows = cur.fetchall()
        conn.commit()
        return [dict(row) for row in rows]


def delete_record_by_id(table_name: str, record_id: str) -> list[dict[str, Any]]:
    statement = sql.SQL("delete from {} where id = {} returning *").format(
        _table_identifier(table_name),
        sql.Placeholder(),
    )

    with connect(_require_database_url(), **_connection_kwargs()) as conn:
        with conn.cursor() as cur:
            cur.execute(statement, (record_id,))
            rows = cur.fetchall()
        conn.commit()
        return [dict(row) for row in rows]


def ensure_auth_event_notifications_table() -> None:
    execute(
        """
        create table if not exists public.auth_event_notifications (
          id uuid primary key,
          user_id text not null,
          event_type text not null,
          created_at timestamptz not null default now()
        );
        """
    )
    execute(
        """
        create unique index if not exists auth_event_notifications_user_event_idx
        on public.auth_event_notifications (user_id, event_type);
        """
    )

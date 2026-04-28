from clients.supabase_client import MissingSupabaseTableError, SupabaseClient


def assert_tables_exist(supabase: SupabaseClient, tables: tuple[str, ...]) -> None:
    for table in tables:
        try:
            supabase.select(table, columns="*", limit=1)
        except MissingSupabaseTableError as exc:
            missing_table = exc.table or table
            raise RuntimeError(
                f"Supabase table '{missing_table}' is missing. "
                "Apply the required schema to the target database before processing callback jobs."
            ) from exc

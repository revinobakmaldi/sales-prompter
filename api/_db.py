"""Shared Supabase client factory."""
import os
from supabase import create_client, Client


def get_db() -> Client:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_ANON_KEY", "")
    return create_client(url, key)

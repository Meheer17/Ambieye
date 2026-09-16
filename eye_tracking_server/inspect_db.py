"""
Ambieye Database Viewer Utility
Run with: python inspect_db.py [table_name]
"""
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / "ambieye.db"

def inspect(table_name=None):
    if not DB_PATH.exists():
        print(f"[!] Database file not found at: {DB_PATH}")
        return

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row["name"] for row in cursor.fetchall()]

    if not table_name:
        print("\n" + "=" * 60)
        print("          AMBIEYE DATABASE SUMMARY (ambieye.db)")
        print("=" * 60)
        for t in tables:
            cursor.execute(f"SELECT COUNT(*) as cnt FROM {t}")
            cnt = cursor.fetchone()["cnt"]
            print(f" • {t:<26} : {cnt} rows")
        print("=" * 60)
        print("\nTip: To view records of a specific table, run:")
        print("     python inspect_db.py <table_name>\n")
    else:
        if table_name not in tables:
            print(f"\n[!] Table '{table_name}' does not exist.")
            print(f"Available tables: {', '.join(tables)}\n")
            conn.close()
            return

        cursor.execute(f"SELECT * FROM {table_name} LIMIT 20")
        rows = cursor.fetchall()
        print("\n" + "=" * 80)
        print(f" TABLE: {table_name} (Showing first {len(rows)} rows)")
        print("=" * 80)
        if not rows:
            print(" (Empty table - 0 records)")
        else:
            for idx, r in enumerate(rows, 1):
                print(f"\n[{idx}] " + "-" * 50)
                for k in r.keys():
                    print(f"  {k:<24}: {r[k]}")
        print("=" * 80 + "\n")

    conn.close()

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    inspect(target)

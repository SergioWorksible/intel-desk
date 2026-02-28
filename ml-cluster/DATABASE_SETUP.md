# DATABASE_URL Configuration for pgvector

To use pgvector you need a direct PostgreSQL connection. Supabase offers several options:

## Option 1: Pooler Session Mode (Recommended - Supports IPv4)

**Best for**: Persistent connections when you don't have IPv6

1. Go to your Supabase Dashboard
2. Click **Connect** (top)
3. Select **Session pooler**
4. Copy the connection string

Format:
```
postgres://postgres.xxx:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

**Advantages**:
- ✅ Supports IPv4 (works on most networks)
- ✅ Compatible with pgvector
- ✅ Works with prepared statements

## Option 2: Direct Connection (Requires IPv6)

**Best for**: Persistent connections with IPv6 enabled

1. Go to your Supabase Dashboard
2. Click **Connect**
3. Select **Direct connection**
4. Copy the connection string

Format:
```
postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
```

**Advantages**:
- ✅ Lower latency
- ✅ Compatible with pgvector
- ❌ Requires IPv6 (may not work on all networks)

## Option 3: Dedicated Pooler (Paid plans only)

If you have a paid plan, you can use the Dedicated Pooler for better performance.

## Verify your connection

Once configured, test the connection:

```python
import psycopg2

try:
    conn = psycopg2.connect("YOUR_DATABASE_URL")
    cur = conn.cursor()
    cur.execute("SELECT version();")
    print("✓ Connection successful:", cur.fetchone())
    cur.close()
    conn.close()
except Exception as e:
    print("❌ Error:", e)
```

## Troubleshooting

### Error: "could not translate host name"
- Verify the hostname is correct
- Try using Session Pooler instead of Direct connection
- Verify your internet connection

### Error: "Password authentication failed"
- Verify the password in Supabase Dashboard > Settings > Database
- Ensure the password is properly escaped in the URL

### Error: "Connection refused"
- Verify the port is correct (5432 for session mode, 6543 for transaction mode)
- Verify your firewall allows outbound connections

## Note on Transaction Mode

**Do NOT use Transaction Mode** (`:6543`) for pgvector because:
- Does not support prepared statements
- Can cause issues with complex operations
- pgvector needs a more stable connection

Always use **Session Mode** (`:5432`) or **Direct Connection**.

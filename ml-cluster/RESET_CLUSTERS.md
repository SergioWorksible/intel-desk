# Reset and Full Reclustering

Guide to delete all clusters and recalculate them with the ML system.

## Option 1: Use the API Endpoint (Recommended)

### Step 1: Reset and Recluster in one command

```bash
curl -X POST http://localhost:5001/api/recluster \
  -H "Content-Type: application/json" \
  -d '{
    "days": 30,
    "limit": 1000,
    "reset_first": true
  }'
```

Or from PowerShell:

```powershell
$body = @{
    days = 30
    limit = 1000
    reset_first = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5001/api/recluster" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Step 2: Reset only (without reclustering)

If you only want to clean without recalculating:

```powershell
$body = @{
    confirm = $true
    clear_article_embeddings = $false  # true to also delete embeddings
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5001/api/reset-clusters" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

## Option 2: Direct SQL (Faster for large volumes)

Run in Supabase SQL Editor:

```sql
-- 1. Unassign all articles
UPDATE articles SET cluster_id = NULL WHERE cluster_id IS NOT NULL;

-- 2. Delete all clusters
DELETE FROM clusters;

-- 3. Delete cluster embeddings
DELETE FROM cluster_embeddings;

-- 4. (Optional) Delete article embeddings too
-- DELETE FROM article_embeddings;
```

Then run clustering from the API or from Next.js.

## Option 3: From Next.js

If you have access to the Next.js UI, you can create a button that calls:

```typescript
// In some admin component or page
const resetAndRecluster = async () => {
  const response = await fetch('http://localhost:5001/api/recluster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      days: 30,
      limit: 1000,
      reset_first: true
    })
  })
  const result = await response.json()
  console.log('Reclustering result:', result)
}
```

## `/api/recluster` Endpoint Parameters

- `days` (default: 30): Days back to search for articles
- `limit` (default: 1000): Maximum articles to process
- `reset_first` (default: true): If true, clean clusters before recalculating

## `/api/reset-clusters` Endpoint Parameters

- `confirm` (required): Must be `true` to confirm
- `clear_article_embeddings` (default: false): If true, also deletes article embeddings

## Estimated Time

- Reset: ~1-5 seconds
- Reclustering 1000 articles: ~2-5 minutes
- Reclustering 5000 articles: ~10-15 minutes

## ⚠️ Warnings

1. **Backup**: Consider backing up the `clusters` table before resetting
2. **Time**: Reclustering may take several minutes with many articles
3. **Resources**: Service needs sufficient RAM (2GB+ recommended)
4. **Concurrency**: Do not run multiple reclusterings simultaneously

## Verify Results

After reclustering, verify:

```sql
-- Count created clusters
SELECT COUNT(*) FROM clusters;

-- Count clustered articles
SELECT COUNT(*) FROM articles WHERE cluster_id IS NOT NULL;

-- See cluster size distribution
SELECT article_count, COUNT(*) as cluster_count
FROM clusters
GROUP BY article_count
ORDER BY article_count;
```

# Installation Guide - ML Cluster Service

## Windows PowerShell

### 1. Create virtual environment

```powershell
cd ml-cluster
python -m venv venv
```

### 2. Activate virtual environment

**IMPORTANT**: In PowerShell you need to allow script execution first:

```powershell
# Run once as administrator (first time only)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then activate the environment:

```powershell
.\venv\Scripts\Activate.ps1
```

If you see an execution policy error, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```powershell
pip install -r requirements.txt
```

This may take several minutes the first time (downloads ML models).

### 4. Configure .env

Copy `.env.example` to `.env` and fill in your credentials:

```powershell
Copy-Item .env.example .env
# Edit .env with your Supabase credentials
```

### 5. Run SQL migration

In Supabase Dashboard > SQL Editor, execute:
`supabase/migrations/006_pgvector_embeddings.sql`

### 6. Start service

**Option A: Use PowerShell script**
```powershell
.\start.ps1
```

**Option B: Manual**
```powershell
.\venv\Scripts\Activate.ps1
python run.py
```

## PowerShell Troubleshooting

### Error: "cannot be loaded because running scripts is disabled"

Solution:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Error: "Activate.ps1 cannot be loaded"

Temporary solution:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\venv\Scripts\Activate.ps1
```

### Model takes long to download

Normal the first time. The `paraphrase-multilingual-MiniLM-L12-v2` model is ~420MB and downloads automatically.

### Verify installation

```powershell
python -c "import sentence_transformers; print('OK')"
```

If it works, you'll see "OK". If not, reinstall:
```powershell
pip install --upgrade sentence-transformers
```

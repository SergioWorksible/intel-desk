"""
Flask API for the ML clustering service
"""
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import numpy as np

from config import Config
from services.embeddings import get_embedding_service
from services.clustering import ClusteringService, DeduplicationService
from services.database import DatabaseService
from services.enrichment import EnrichmentService

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)  # Allow CORS for Next.js

# Services (lazy loading)
_embedding_service = None
_clustering_service = None
_dedup_service = None
_db_service = None
_enrichment_service = None


def get_services():
    """Initialize services lazily"""
    global _embedding_service, _clustering_service, _dedup_service, _db_service, _enrichment_service
    
    if _embedding_service is None:
        logger.info("Initializing services...")
        _embedding_service = get_embedding_service(Config.EMBEDDING_MODEL)
        _clustering_service = ClusteringService(
            min_cluster_size=Config.MIN_CLUSTER_SIZE,
            min_samples=Config.MIN_SAMPLES
        )
        _dedup_service = DeduplicationService(threshold=Config.DEDUP_THRESHOLD)
        _db_service = DatabaseService()
        _enrichment_service = EnrichmentService()
        logger.info("Services initialized")
    
    return _embedding_service, _clustering_service, _dedup_service, _db_service, _enrichment_service


# ==================== ENDPOINTS ====================

@app.route("/health", methods=["GET"])
def health():
    """Health check"""
    return jsonify({
        "status": "ok",
        "service": "ml-cluster",
        "timestamp": datetime.utcnow().isoformat()
    })


@app.route("/api/embed", methods=["POST"])
def embed_texts():
    """
    Generate embeddings for texts.
    
    Body: { "texts": ["text1", "text2", ...] }
    Response: { "embeddings": [[...], [...], ...] }
    """
    try:
        data = request.get_json()
        texts = data.get("texts", [])
        
        if not texts:
            return jsonify({"error": "No texts provided"}), 400
        
        embedding_service, _, _, _, _ = get_services()
        embeddings = embedding_service.encode(texts)
        
        return jsonify({
            "embeddings": embeddings.tolist(),
            "dimension": embedding_service.embedding_dim,
            "count": len(texts)
        })
    except Exception as e:
        logger.error(f"Error en embed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/similarity", methods=["POST"])
def calculate_similarity():
    """
    Calculate similarity between texts.
    
    Body: { "text1": "...", "text2": "..." }
    Response: { "similarity": 0.85 }
    """
    try:
        data = request.get_json()
        text1 = data.get("text1")
        text2 = data.get("text2")
        
        if not text1 or not text2:
            return jsonify({"error": "text1 and text2 required"}), 400
        
        embedding_service, _, _, _, _ = get_services()
        emb1 = embedding_service.encode_single(text1)
        emb2 = embedding_service.encode_single(text2)
        similarity = embedding_service.cosine_similarity(emb1, emb2)
        
        return jsonify({
            "similarity": similarity,
            "is_similar": similarity >= Config.SIMILARITY_THRESHOLD
        })
    except Exception as e:
        logger.error(f"Error in similarity: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/cluster", methods=["POST"])
def cluster_articles():
    """
    Main clustering endpoint.
    Processes unclustered articles and groups them.
    
    Body: { "days": 7, "limit": 500 } (optional)
    Response: { "created": 5, "updated": 10, "duplicates": 3 }
    """
    try:
        data = request.get_json() or {}
        days = data.get("days", 7)
        limit = data.get("limit", 500)
        
        embedding_service, clustering_service, dedup_service, db_service, enrichment_service = get_services()
        
        # 1. Obtener artículos sin cluster
        logger.info(f"Fetching unclustered articles (last {days} days, limit {limit})")
        articles = db_service.get_unclustered_articles(days=days, limit=limit)
        
        if not articles:
            return jsonify({
                "message": "No unclustered articles",
                "created": 0,
                "updated": 0,
                "duplicates": 0
            })
        
        logger.info(f"Procesando {len(articles)} artículos")
        
        # 2. Preparar textos y generar embeddings
        article_ids = [a["id"] for a in articles]
        texts = [
            embedding_service.prepare_article_text(
                title=a["title"],
                snippet=a.get("snippet"),
                content=a.get("full_content"),
                countries=a.get("countries"),
                topics=a.get("topics")
            )
            for a in articles
        ]
        
        logger.info("Generando embeddings...")
        embeddings = embedding_service.encode(texts, show_progress=True)
        
        # 3. Guardar embeddings
        logger.info("Saving embeddings to database...")
        db_service.store_article_embeddings_batch(article_ids, embeddings)
        
        # 4. Deduplicar
        logger.info("Buscando duplicados...")
        embeddings, article_ids, duplicates = dedup_service.deduplicate(
            embeddings, article_ids
        )
        
        # Mapear IDs a artículos
        articles_map = {a["id"]: a for a in articles}
        articles = [articles_map[aid] for aid in article_ids]
        
        # 5. Buscar matches con clusters existentes (solo si pgvector está disponible)
        logger.info("Searching for existing clusters...")
        updated = 0
        remaining_mask = [True] * len(article_ids)
        
        try:
            for idx, (aid, emb) in enumerate(zip(article_ids, embeddings)):
                similar_clusters = db_service.find_similar_clusters(
                    emb,
                    threshold=Config.SIMILARITY_THRESHOLD
                )
                
                if similar_clusters:
                    best_cluster_id, similarity = similar_clusters[0]
                    logger.info(f"Artículo {aid} → Cluster {best_cluster_id} (sim={similarity:.3f})")
                    
                    # Asignar al cluster existente
                    db_service.update_article_cluster(aid, best_cluster_id)
                    
                    remaining_mask[idx] = False
                    updated += 1
        except Exception as e:
            logger.warning(f"Similar cluster search unavailable: {e}")
            # Continuar sin matching, crear nuevos clusters
        
        # 6. Clustering de artículos restantes
        remaining_embeddings = embeddings[remaining_mask]
        remaining_ids = [aid for aid, keep in zip(article_ids, remaining_mask) if keep]
        remaining_articles = [articles_map[aid] for aid in remaining_ids]
        
        logger.info(f"Clustering {len(remaining_ids)} remaining articles...")
        clusters = clustering_service.cluster_embeddings(remaining_embeddings, remaining_ids)
        
        # 7. Crear nuevos clusters
        created = 0
        for cluster_label, cluster_article_ids in clusters.items():
            if cluster_label == -1:  # Outliers, no crear cluster
                continue
            
            if len(cluster_article_ids) < 2:
                continue
            
            cluster_articles = [articles_map[aid] for aid in cluster_article_ids]
            cluster_emb_indices = [article_ids.index(aid) for aid in cluster_article_ids]
            cluster_embeddings = embeddings[cluster_emb_indices]
            
            # Calcular centroide
            centroid = np.mean(cluster_embeddings, axis=0)
            centroid = centroid / np.linalg.norm(centroid)
            
            # Calcular metadatos
            dates = [
                datetime.fromisoformat(a["published_at"].replace("Z", "+00:00"))
                for a in cluster_articles
                if a.get("published_at")
            ]
            
            if not dates:
                dates = [datetime.utcnow()]
            
            window_start = min(dates).isoformat()
            window_end = max(dates).isoformat()
            
            # Agregar países y topics
            countries = list(set(
                c for a in cluster_articles
                for c in (a.get("countries") or [])
            ))[:10]
            
            topics = list(set(
                t for a in cluster_articles
                for t in (a.get("topics") or [])
            ))[:10]
            
            # Canonical title (use first article's for now)
            canonical_title = cluster_articles[0]["title"]
            
            # Count unique sources
            sources = set(a.get("source_id") for a in cluster_articles if a.get("source_id"))
            
            # Calculate severity and confidence
            severity = min(100, 30 + len(cluster_article_ids) * 10 + len(sources) * 5)
            confidence = min(100, 40 + len(cluster_article_ids) * 8 + len(sources) * 6)
            
            # Crear cluster
            new_cluster = db_service.create_cluster(
                canonical_title=canonical_title,
                summary=f"Event covered by {len(cluster_article_ids)} articles from {len(sources)} sources",
                countries=countries,
                topics=topics,
                article_count=len(cluster_article_ids),
                source_count=len(sources),
                window_start=window_start,
                window_end=window_end,
                severity=severity,
                confidence=confidence,
                embedding=centroid
            )
            
            if new_cluster:
                # Asignar artículos al cluster
                db_service.update_articles_cluster(cluster_article_ids, new_cluster["id"])
                
                # Enrich with GPT
                try:
                    enrichment = enrichment_service.enrich_cluster(new_cluster, cluster_articles)
                    if enrichment:
                        # Update cluster with enriched data
                        update_data = {
                            "canonical_title": enrichment.get("canonical_title", canonical_title),
                            "summary": enrichment.get("summary", ""),
                            "countries": enrichment.get("countries", countries),
                            "topics": enrichment.get("topics", topics),
                            "severity": enrichment.get("severity", severity),
                            "confidence": enrichment.get("confidence", confidence),
                            "entities": {
                                "people": enrichment.get("entities", {}).get("people", []),
                                "organizations": enrichment.get("entities", {}).get("organizations", []),
                                "locations": enrichment.get("entities", {}).get("locations", []),
                                "events": enrichment.get("entities", {}).get("events", []),
                                "geopolitical_implications": enrichment.get("geopolitical_implications", []),
                                "key_signals": enrichment.get("key_signals", []),
                                "market_impact": enrichment.get("market_impact"),
                                "map_data": enrichment.get("map_data")
                            }
                        }
                        db_service.update_cluster(new_cluster["id"], update_data)
                        logger.info(f"✓ Cluster {new_cluster['id']} enriquecido con GPT")
                    else:
                        logger.warning(f"⚠ No se pudo enriquecer cluster {new_cluster['id']}")
                except Exception as e:
                    logger.error(f"Error enriching cluster {new_cluster.get('id')}: {e}", exc_info=True)
                    # Continue even if enrichment fails
                
                created += 1
                logger.info(f"Created cluster: {canonical_title[:50]}... ({len(cluster_article_ids)} articles)")
        
        result = {
            "message": "Clustering completed",
            "processed": len(articles),
            "created": created,
            "updated": updated,
            "duplicates": len(duplicates),
            "outliers": len(clusters.get(-1, []))
        }
        
        logger.info(f"Resultado: {result}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in cluster: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/deduplicate", methods=["POST"])
def deduplicate():
    """
    Find and mark duplicate articles.
    
    Body: { "days": 7, "limit": 500 }
    Response: { "duplicates": [{"id1": "...", "id2": "...", "similarity": 0.95}] }
    """
    try:
        data = request.get_json() or {}
        days = data.get("days", 7)
        limit = data.get("limit", 500)
        
        embedding_service, _, dedup_service, db_service, _ = get_services()
        
        # Obtener artículos recientes
        articles = db_service.get_unclustered_articles(days=days, limit=limit)
        
        if len(articles) < 2:
            return jsonify({"duplicates": []})
        
        # Generar embeddings
        article_ids = [a["id"] for a in articles]
        texts = [
            embedding_service.prepare_article_text(
                title=a["title"],
                snippet=a.get("snippet")
            )
            for a in articles
        ]
        
        embeddings = embedding_service.encode(texts)
        
        # Encontrar duplicados
        duplicates = dedup_service.find_duplicates(embeddings, article_ids)
        
        return jsonify({
            "duplicates": [
                {"id1": d[0], "id2": d[1], "similarity": d[2]}
                for d in duplicates
            ],
            "count": len(duplicates)
        })
        
    except Exception as e:
        logger.error(f"Error in deduplicate: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/find-cluster", methods=["POST"])
def find_cluster_for_article():
    """
    Find the best cluster for an article.
    
    Body: { "title": "...", "snippet": "...", "countries": [...], "topics": [...] }
    Response: { "cluster_id": "...", "similarity": 0.85 } o { "cluster_id": null }
    """
    try:
        data = request.get_json()
        
        embedding_service, _, _, db_service, _ = get_services()
        
        # Preparar texto y generar embedding
        text = embedding_service.prepare_article_text(
            title=data.get("title", ""),
            snippet=data.get("snippet"),
            countries=data.get("countries"),
            topics=data.get("topics")
        )
        
        embedding = embedding_service.encode_single(text)
        
        # Buscar clusters similares
        similar = db_service.find_similar_clusters(
            embedding,
            threshold=Config.SIMILARITY_THRESHOLD
        )
        
        if similar:
            return jsonify({
                "cluster_id": similar[0][0],
                "similarity": similar[0][1],
                "alternatives": [
                    {"cluster_id": c[0], "similarity": c[1]}
                    for c in similar[1:]
                ]
            })
        
        return jsonify({"cluster_id": None, "similarity": 0})
        
    except Exception as e:
        logger.error(f"Error in find-cluster: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/reset-clusters", methods=["POST"])
def reset_clusters():
    """
    CLEARS ALL CLUSTERS AND UNASSIGNS ARTICLES.
    ⚠️ DANGEROUS: Deletes all existing clusters.
    
    Body: { "confirm": true } (required to confirm)
    """
    try:
        data = request.get_json() or {}
        confirm = data.get("confirm", False)
        
        if not confirm:
            return jsonify({
                "error": "You must confirm with { 'confirm': true }"
            }), 400
        
        embedding_service, clustering_service, dedup_service, db_service, enrichment_service = get_services()
        
        logger.warning("⚠️ RESET CLUSTERS: Clearing all clusters...")
        
        # 1. Desasignar todos los artículos usando Supabase client
        logger.info("Unassigning articles from clusters...")
        try:
            # Get all articles with non-null cluster_id
            articles_response = db_service.supabase.table("articles").select("id").not_.is_("cluster_id", "null").limit(10000).execute()
            article_ids = [a["id"] for a in (articles_response.data or [])]
            
            articles_unlinked = 0
            if article_ids:
                # Update in smaller batches (long URLs cause 400 errors)
                BATCH_SIZE = 50
                for i in range(0, len(article_ids), BATCH_SIZE):
                    batch = article_ids[i:i + BATCH_SIZE]
                    try:
                        db_service.supabase.table("articles").update({"cluster_id": None}).in_("id", batch).execute()
                        articles_unlinked += len(batch)
                    except Exception as e:
                        logger.warning(f"Error actualizando batch {i//BATCH_SIZE + 1}: {e}")
                        # Continuar con el siguiente batch
        except Exception as e:
            logger.error(f"Error unassigning articles: {e}")
            articles_unlinked = 0
        
        # 2. Delete all clusters
        logger.info("Deleting clusters...")
        try:
            # Get all cluster IDs first
            clusters_response = db_service.supabase.table("clusters").select("id").execute()
            cluster_ids = [c["id"] for c in (clusters_response.data or [])]
            
            clusters_deleted = 0
            if cluster_ids:
                # Delete in smaller batches (long URLs cause 400 errors)
                BATCH_SIZE = 50
                for i in range(0, len(cluster_ids), BATCH_SIZE):
                    batch = cluster_ids[i:i + BATCH_SIZE]
                    try:
                        db_service.supabase.table("clusters").delete().in_("id", batch).execute()
                        clusters_deleted += len(batch)
                    except Exception as e:
                        logger.warning(f"Error deleting batch {i//BATCH_SIZE + 1}: {e}")
                        # Continuar con el siguiente batch
        except Exception as e:
            logger.error(f"Error borrando clusters: {e}")
            clusters_deleted = 0
        
        # 3. Borrar embeddings de clusters (opcional, solo si pgvector está disponible)
        logger.info("Deleting cluster embeddings...")
        cluster_embeddings_deleted = 0
        try:
            if Config.DATABASE_URL:
                conn = db_service._get_pg_connection()
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM cluster_embeddings")
                    cluster_embeddings_deleted = cur.rowcount
                    conn.commit()
            else:
                logger.info("DATABASE_URL no configurada, saltando borrado de embeddings")
        except Exception as e:
            logger.warning(f"Could not delete embeddings de clusters (puede ser normal si pgvector no está configurado): {e}")
            cluster_embeddings_deleted = 0
        
        # 4. Opcional: Borrar embeddings de artículos también (para empezar desde cero)
        clear_article_embeddings = data.get("clear_article_embeddings", False)
        article_embeddings_deleted = 0
        if clear_article_embeddings:
            logger.info("Deleting article embeddings...")
            try:
                if Config.DATABASE_URL:
                    conn = db_service._get_pg_connection()
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM article_embeddings")
                        article_embeddings_deleted = cur.rowcount
                        conn.commit()
            except Exception as e:
                logger.warning(f"Could not delete embeddings de artículos: {e}")
        
        logger.info(f"✓ Reset completed: {clusters_deleted} clusters deleted, {articles_unlinked} articles unassigned")
        
        return jsonify({
            "message": "Reset completed",
            "clusters_deleted": clusters_deleted,
            "articles_unlinked": articles_unlinked,
            "cluster_embeddings_deleted": cluster_embeddings_deleted,
            "article_embeddings_deleted": article_embeddings_deleted
        })
        
    except Exception as e:
        logger.error(f"Error en reset-clusters: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/recluster", methods=["POST"])
def recluster():
    """
    Re-clusteriza todos los artículos desde cero.
    Primero limpia clusters existentes, luego ejecuta clustering ML.
    
    Body: { 
        "days": 30,  # Días hacia atrás para buscar artículos
        "limit": 1000,  # Máximo de artículos a procesar
        "reset_first": true  # Si true, limpia clusters primero
    }
    """
    try:
        data = request.get_json() or {}
        days = data.get("days", 30)
        limit = data.get("limit", 1000)
        reset_first = data.get("reset_first", True)
        
        embedding_service, clustering_service, dedup_service, db_service, enrichment_service = get_services()
        
        # Step 1: Reset if requested
        if reset_first:
            logger.info("Clearing existing clusters...")
            try:
                # Desasignar todos los artículos usando Supabase client
                # Get articles with non-null cluster_id
                articles_response = db_service.supabase.table("articles").select("id").not_.is_("cluster_id", "null").limit(10000).execute()
                article_ids = [a["id"] for a in (articles_response.data or [])]
                
                articles_unlinked = 0
                if article_ids:
                    # Smaller batch to avoid URLs that are too long
                    BATCH_SIZE = 50  # Reducido para evitar URLs demasiado largas
                    for i in range(0, len(article_ids), BATCH_SIZE):
                        batch = article_ids[i:i + BATCH_SIZE]
                        try:
                            db_service.supabase.table("articles").update({"cluster_id": None}).in_("id", batch).execute()
                            articles_unlinked += len(batch)
                        except Exception as e:
                            logger.warning(f"Error actualizando batch {i//BATCH_SIZE + 1}: {e}")
                            # Continuar con el siguiente batch
                
                # Delete all clusters
                clusters_response = db_service.supabase.table("clusters").select("id").execute()
                cluster_ids = [c["id"] for c in (clusters_response.data or [])]
                
                clusters_deleted = 0
                if cluster_ids:
                    # Smaller batch to avoid URLs that are too long
                    BATCH_SIZE = 50  # Reducido para evitar URLs demasiado largas
                    for i in range(0, len(cluster_ids), BATCH_SIZE):
                        batch = cluster_ids[i:i + BATCH_SIZE]
                        try:
                            db_service.supabase.table("clusters").delete().in_("id", batch).execute()
                            clusters_deleted += len(batch)
                        except Exception as e:
                            logger.warning(f"Error deleting batch {i//BATCH_SIZE + 1}: {e}")
                            # Continuar con el siguiente batch
                
                # Delete cluster embeddings (optional)
                try:
                    if Config.DATABASE_URL:
                        conn = db_service._get_pg_connection()
                        with conn.cursor() as cur:
                            cur.execute("DELETE FROM cluster_embeddings")
                            conn.commit()
                except Exception as e:
                    logger.warning(f"Could not delete embeddings (puede ser normal): {e}")
                
                logger.info(f"✓ Reset: {clusters_deleted} clusters deleted, {articles_unlinked} articles unassigned")
            except Exception as e:
                logger.error(f"Error en reset: {e}", exc_info=True)
                return jsonify({"error": f"Error en reset: {str(e)}"}), 500
        
        # Step 2: Run full clustering
        logger.info(f"Running ML clustering (last {days} days, limit {limit})...")
        
            # Get ALL unclustered articles (or all if reset_first was True)
        articles = db_service.get_unclustered_articles(days=days, limit=limit)
        
        if not articles:
            return jsonify({
                "message": "No articles to cluster",
                "processed": 0,
                "created": 0,
                "updated": 0
            })
        
        logger.info(f"Procesando {len(articles)} artículos...")
        
        # Preparar textos y generar embeddings
        article_ids = [a["id"] for a in articles]
        texts = [
            embedding_service.prepare_article_text(
                title=a["title"],
                snippet=a.get("snippet"),
                content=a.get("full_content"),
                countries=a.get("countries"),
                topics=a.get("topics")
            )
            for a in articles
        ]
        
        logger.info("Generando embeddings...")
        embeddings = embedding_service.encode(texts, show_progress=True)
        
        # Guardar embeddings
        logger.info("Guardando embeddings...")
        db_service.store_article_embeddings_batch(article_ids, embeddings)
        
        # Deduplicar
        logger.info("Buscando duplicados...")
        embeddings, article_ids, duplicates = dedup_service.deduplicate(
            embeddings, article_ids
        )
        
        articles_map = {a["id"]: a for a in articles}
        articles = [articles_map[aid] for aid in article_ids]
        
        # Clustering
        logger.info(f"Clustering {len(article_ids)} artículos...")
        clusters = clustering_service.cluster_embeddings(embeddings, article_ids)
        
        # Crear clusters
        created = 0
        for cluster_label, cluster_article_ids in clusters.items():
            if cluster_label == -1 or len(cluster_article_ids) < 2:
                continue
            
            cluster_articles = [articles_map[aid] for aid in cluster_article_ids]
            cluster_emb_indices = [article_ids.index(aid) for aid in cluster_article_ids]
            cluster_embeddings = embeddings[cluster_emb_indices]
            
            # Calcular centroide
            centroid = np.mean(cluster_embeddings, axis=0)
            centroid = centroid / np.linalg.norm(centroid)
            
            # Metadata
            dates = [
                datetime.fromisoformat(a["published_at"].replace("Z", "+00:00"))
                for a in cluster_articles
                if a.get("published_at")
            ]
            
            if not dates:
                dates = [datetime.utcnow()]
            
            window_start = min(dates).isoformat()
            window_end = max(dates).isoformat()
            
            countries = list(set(
                c for a in cluster_articles
                for c in (a.get("countries") or [])
            ))[:10]
            
            topics = list(set(
                t for a in cluster_articles
                for t in (a.get("topics") or [])
            ))[:10]
            
            canonical_title = cluster_articles[0]["title"]
            sources = set(a.get("source_id") for a in cluster_articles if a.get("source_id"))
            
            severity = min(100, 30 + len(cluster_article_ids) * 10 + len(sources) * 5)
            confidence = min(100, 40 + len(cluster_article_ids) * 8 + len(sources) * 6)
            
            # Create initial cluster
            new_cluster = db_service.create_cluster(
                canonical_title=canonical_title,
                summary=f"Event covered by {len(cluster_article_ids)} articles from {len(sources)} sources",
                countries=countries,
                topics=topics,
                article_count=len(cluster_article_ids),
                source_count=len(sources),
                window_start=window_start,
                window_end=window_end,
                severity=severity,
                confidence=confidence,
                embedding=centroid
            )
            
            if new_cluster:
                db_service.update_articles_cluster(cluster_article_ids, new_cluster["id"])
                
                # Enrich with GPT
                try:
                    enrichment = enrichment_service.enrich_cluster(new_cluster, cluster_articles)
                    if enrichment:
                        # Update cluster with enriched data
                        update_data = {
                            "canonical_title": enrichment.get("canonical_title", canonical_title),
                            "summary": enrichment.get("summary", ""),
                            "countries": enrichment.get("countries", countries),
                            "topics": enrichment.get("topics", topics),
                            "severity": enrichment.get("severity", severity),
                            "confidence": enrichment.get("confidence", confidence),
                            "entities": {
                                "people": enrichment.get("entities", {}).get("people", []),
                                "organizations": enrichment.get("entities", {}).get("organizations", []),
                                "locations": enrichment.get("entities", {}).get("locations", []),
                                "events": enrichment.get("entities", {}).get("events", []),
                                "geopolitical_implications": enrichment.get("geopolitical_implications", []),
                                "key_signals": enrichment.get("key_signals", []),
                                "market_impact": enrichment.get("market_impact"),
                                "map_data": enrichment.get("map_data")
                            }
                        }
                        db_service.update_cluster(new_cluster["id"], update_data)
                        logger.info(f"✓ Cluster {new_cluster['id']} enriquecido con GPT")
                    else:
                        logger.warning(f"⚠ No se pudo enriquecer cluster {new_cluster['id']}")
                except Exception as e:
                    logger.error(f"Error enriching cluster {new_cluster.get('id')}: {e}", exc_info=True)
                    # Continue even if enrichment fails
                
                created += 1
        
        result = {
            "message": "Reclustering completed",
            "processed": len(articles),
            "created": created,
            "duplicates": len(duplicates),
            "outliers": len(clusters.get(-1, []))
        }
        
        logger.info(f"✓ Reclustering: {result}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in recluster: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ==================== MAIN ====================

if __name__ == "__main__":
    logger.info(f"Starting ML Cluster server on port {Config.PORT}")
    logger.info(f"Embedding model: {Config.EMBEDDING_MODEL}")
    
    # Pre-load model
    get_services()
    
    app.run(
        host="0.0.0.0",
        port=Config.PORT,
        debug=Config.DEBUG
    )

"""
Database service for Supabase + pgvector
"""
import numpy as np
from typing import List, Dict, Optional, Any, Tuple
from supabase import create_client, Client
import psycopg2
from psycopg2.extras import execute_values
import logging
import json

from config import Config

logger = logging.getLogger(__name__)


class DatabaseService:
    """
    Maneja operaciones con Supabase y pgvector.
    """
    
    def __init__(self):
        self.supabase: Client = create_client(
            Config.SUPABASE_URL,
            Config.SUPABASE_SERVICE_KEY
        )
        self._pg_conn = None
    
    def _get_pg_connection(self):
        """
        Get PostgreSQL connection for pgvector.
        Uses Session Pooler or Direct Connection (both compatible with pgvector).
        Does NOT use Transaction Mode (port 6543) because it doesn't support prepared statements.
        """
        # If connection exists but is in invalid state, reset it
        if self._pg_conn and not self._pg_conn.closed:
            try:
                # Verificar si la conexión está en un estado válido
                with self._pg_conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    cur.fetchone()
            except (psycopg2.InterfaceError, psycopg2.OperationalError, psycopg2.InternalError, psycopg2.ProgrammingError):
                # Connection is in invalid state, close it and create a new one
                try:
                    self._pg_conn.rollback()
                    self._pg_conn.close()
                except:
                    pass
                self._pg_conn = None
        
        if self._pg_conn is None or self._pg_conn.closed:
            if not Config.DATABASE_URL:
                raise ValueError(
                    "DATABASE_URL no configurada. Las operaciones de pgvector no estarán disponibles.\n"
                    "Obtén la connection string de Supabase Dashboard > Connect > Session pooler"
                )
            try:
                # Verify it's not transaction mode (port 6543)
                if ":6543" in Config.DATABASE_URL:
                    logger.warning(
                        "⚠️ Transaction Mode (port 6543) detected. "
                        "pgvector works better with Session Mode (port 5432) or Direct Connection.\n"
                        "Get the connection string from: Supabase Dashboard > Connect > Session pooler"
                    )
                
                self._pg_conn = psycopg2.connect(
                    Config.DATABASE_URL,
                    connect_timeout=10,
                    # Disable prepared statements if using transaction mode
                    options="-c statement_timeout=30000"
                )
                logger.info("✓ Conexión a PostgreSQL establecida para pgvector")
            except psycopg2.OperationalError as e:
                error_msg = str(e)
                if "could not translate host name" in error_msg:
                    logger.error(
                        "❌ Cannot resolve database hostname.\n"
                        "Solution:\n"
                        "1. Verify DATABASE_URL is correct\n"
                        "2. Use Session Pooler (port 5432) instead of Direct Connection\n"
                        "3. Get the connection string from: Supabase Dashboard > Connect > Session pooler"
                    )
                elif "Password authentication failed" in error_msg:
                    logger.error(
                        "❌ Autenticación fallida.\n"
                        "Verifica la contraseña en Supabase Dashboard > Settings > Database"
                    )
                else:
                    logger.error(f"❌ Connection error: {e}")
                raise
            except Exception as e:
                logger.error(f"❌ Unexpected error connecting to PostgreSQL: {e}")
                raise
        return self._pg_conn
    
    def close(self):
        """Close connections"""
        if self._pg_conn and not self._pg_conn.closed:
            self._pg_conn.close()
    
    # ==================== ARTÍCULOS ====================
    
    def get_unclustered_articles(
        self,
        days: int = 7,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """
        Obtiene artículos sin cluster de los últimos N días.
        """
        from datetime import datetime, timedelta
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        response = self.supabase.table("articles") \
            .select("*") \
            .is_("cluster_id", "null") \
            .gte("created_at", cutoff) \
            .order("published_at", desc=True) \
            .limit(limit) \
            .execute()
        
        return response.data or []
    
    def get_articles_by_ids(self, article_ids: List[str]) -> List[Dict[str, Any]]:
        """Obtiene artículos por sus IDs"""
        if not article_ids:
            return []
        
        response = self.supabase.table("articles") \
            .select("*") \
            .in_("id", article_ids) \
            .execute()
        
        return response.data or []
    
    def update_article_cluster(self, article_id: str, cluster_id: str):
        """Asigna un artículo a un cluster"""
        self.supabase.table("articles") \
            .update({"cluster_id": cluster_id}) \
            .eq("id", article_id) \
            .execute()
    
    def update_articles_cluster(self, article_ids: List[str], cluster_id: str):
        """Asigna múltiples artículos a un cluster"""
        if not article_ids:
            return
        
        self.supabase.table("articles") \
            .update({"cluster_id": cluster_id}) \
            .in_("id", article_ids) \
            .execute()
    
    def mark_articles_as_duplicate(self, article_ids: List[str], keep_id: str):
        """
        Marca artículos como duplicados.
        Opcionalmente podrías tener un campo 'duplicate_of' en la tabla.
        """
        # Por ahora, simplemente no los procesamos
        logger.info(f"Artículos duplicados detectados: {article_ids}, manteniendo {keep_id}")
    
    # ==================== CLUSTERS ====================
    
    def get_recent_clusters(self, days: int = 7, limit: int = 100) -> List[Dict[str, Any]]:
        """Obtiene clusters recientes"""
        from datetime import datetime, timedelta
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        response = self.supabase.table("clusters") \
            .select("*") \
            .gte("window_end", cutoff) \
            .order("updated_at", desc=True) \
            .limit(limit) \
            .execute()
        
        return response.data or []
    
    def create_cluster(
        self,
        canonical_title: str,
        summary: str,
        countries: List[str],
        topics: List[str],
        article_count: int,
        source_count: int,
        window_start: str,
        window_end: str,
        severity: int = 50,
        confidence: int = 50,
        entities: Optional[Dict] = None,
        embedding: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Crea un nuevo cluster.
        """
        data = {
            "canonical_title": canonical_title,
            "summary": summary,
            "countries": countries,
            "topics": topics,
            "article_count": article_count,
            "source_count": source_count,
            "window_start": window_start,
            "window_end": window_end,
            "severity": severity,
            "confidence": confidence,
            "entities": entities or {}
        }
        
        response = self.supabase.table("clusters") \
            .insert(data) \
            .execute()
        
        cluster = response.data[0] if response.data else None
        
        # Si tenemos embedding, guardarlo en pgvector
        if cluster and embedding is not None:
            self.store_cluster_embedding(cluster["id"], embedding)
        
        return cluster
    
    def update_cluster(self, cluster_id: str, data: Dict[str, Any]):
        """Actualiza un cluster"""
        self.supabase.table("clusters") \
            .update(data) \
            .eq("id", cluster_id) \
            .execute()
    
    # ==================== EMBEDDINGS (pgvector) ====================
    
    def store_article_embedding(self, article_id: str, embedding: np.ndarray):
        """Guarda el embedding de un artículo"""
        try:
            conn = self._get_pg_connection()
            try:
                with conn.cursor() as cur:
                    # Upsert embedding
                    cur.execute("""
                        INSERT INTO article_embeddings (article_id, embedding)
                        VALUES (%s, %s)
                        ON CONFLICT (article_id) 
                        DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
                    """, (article_id, embedding.tolist()))
                    conn.commit()
            except Exception as e:
                # Si hay un error, hacer rollback y reiniciar la conexión
                try:
                    conn.rollback()
                except:
                    pass
                # Marcar la conexión como inválida para que se reinicie en el próximo intento
                self._pg_conn = None
                raise
        except Exception as e:
            logger.warning(f"No se pudo guardar embedding (pgvector no disponible): {e}")
            # No lanzar error, solo loguear
    
    def store_article_embeddings_batch(
        self,
        article_ids: List[str],
        embeddings: np.ndarray
    ):
        """Guarda múltiples embeddings de artículos"""
        if len(article_ids) == 0:
            return
        
        try:
            conn = self._get_pg_connection()
            try:
                with conn.cursor() as cur:
                    data = [(aid, emb.tolist()) for aid, emb in zip(article_ids, embeddings)]
                    execute_values(
                        cur,
                        """
                        INSERT INTO article_embeddings (article_id, embedding)
                        VALUES %s
                        ON CONFLICT (article_id) 
                        DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
                        """,
                        data,
                        template="(%s, %s::vector)"
                    )
                    conn.commit()
                    logger.info(f"Guardados {len(article_ids)} embeddings de artículos")
            except Exception as e:
                # Si hay un error, hacer rollback y reiniciar la conexión
                try:
                    conn.rollback()
                except:
                    pass
                # Marcar la conexión como inválida para que se reinicie en el próximo intento
                self._pg_conn = None
                raise
        except Exception as e:
            logger.warning(f"No se pudieron guardar embeddings (pgvector no disponible): {e}")
            # Continuar sin embeddings, el clustering seguirá funcionando
    
    def store_cluster_embedding(self, cluster_id: str, embedding: np.ndarray):
        """Guarda el embedding de un cluster (centroide)"""
        try:
            conn = self._get_pg_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO cluster_embeddings (cluster_id, embedding)
                        VALUES (%s, %s)
                        ON CONFLICT (cluster_id) 
                        DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
                    """, (cluster_id, embedding.tolist()))
                    conn.commit()
            except Exception as e:
                # Si hay un error, hacer rollback y reiniciar la conexión
                try:
                    conn.rollback()
                except:
                    pass
                # Marcar la conexión como inválida para que se reinicie en el próximo intento
                self._pg_conn = None
                raise
        except Exception as e:
            logger.warning(f"No se pudo guardar embedding de cluster (pgvector no disponible): {e}")
            # No lanzar error, el clustering seguirá funcionando sin embeddings
    
    def find_similar_clusters(
        self,
        embedding: np.ndarray,
        threshold: float = 0.75,
        limit: int = 5
    ) -> List[Tuple[str, float]]:
        """
        Encuentra clusters similares usando pgvector.
        
        Returns:
            Lista de (cluster_id, similarity_score)
        """
        try:
            conn = self._get_pg_connection()
            with conn.cursor() as cur:
                # Usar operador <=> para distancia coseno
                # 1 - distancia = similitud
                cur.execute("""
                    SELECT 
                        ce.cluster_id,
                        1 - (ce.embedding <=> %s::vector) as similarity
                    FROM cluster_embeddings ce
                    JOIN clusters c ON c.id = ce.cluster_id
                    WHERE c.window_end > NOW() - INTERVAL '7 days'
                    AND 1 - (ce.embedding <=> %s::vector) >= %s
                    ORDER BY similarity DESC
                    LIMIT %s
                """, (embedding.tolist(), embedding.tolist(), threshold, limit))
                
                results = cur.fetchall()
                return [(row[0], row[1]) for row in results]
        except Exception as e:
            logger.warning(f"Búsqueda de clusters similares no disponible (pgvector no configurado): {e}")
            return []  # Retornar lista vacía, el clustering seguirá funcionando
    
    def get_article_embeddings(
        self,
        article_ids: List[str]
    ) -> Dict[str, np.ndarray]:
        """Obtiene embeddings de artículos existentes"""
        if not article_ids:
            return {}
        
        try:
            conn = self._get_pg_connection()
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT article_id, embedding
                    FROM article_embeddings
                    WHERE article_id = ANY(%s)
                """, (article_ids,))
                
                results = {}
                for row in cur.fetchall():
                    results[row[0]] = np.array(row[1])
                return results
        except Exception as e:
            logger.error(f"Error obteniendo embeddings: {e}")
            return {}
    
    def get_cluster_articles_embeddings(
        self,
        cluster_id: str
    ) -> Tuple[List[str], np.ndarray]:
        """
        Obtiene los embeddings de todos los artículos de un cluster.
        
        Returns:
            Tuple (article_ids, embeddings_matrix)
        """
        try:
            # Primero obtener IDs de artículos del cluster
            response = self.supabase.table("articles") \
                .select("id") \
                .eq("cluster_id", cluster_id) \
                .execute()
            
            article_ids = [a["id"] for a in (response.data or [])]
            
            if not article_ids:
                return [], np.array([])
            
            # Obtener embeddings
            embeddings_dict = self.get_article_embeddings(article_ids)
            
            # Filtrar solo los que tienen embedding
            valid_ids = [aid for aid in article_ids if aid in embeddings_dict]
            embeddings = np.array([embeddings_dict[aid] for aid in valid_ids])
            
            return valid_ids, embeddings
        except Exception as e:
            logger.error(f"Error obteniendo embeddings del cluster: {e}")
            return [], np.array([])

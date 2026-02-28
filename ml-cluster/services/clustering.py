"""
Clustering service using HDBSCAN
"""
import numpy as np
import hdbscan
from sklearn.cluster import DBSCAN
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class ClusteringService:
    """
    Implements hierarchical clustering using HDBSCAN.
    
    HDBSCAN advantages:
    - Does not need to specify number of clusters
    - Automatically detects outliers
    - Handles clusters of different densities
    - More robust than DBSCAN or K-means
    """
    
    def __init__(
        self,
        min_cluster_size: int = 2,
        min_samples: int = 1,
        metric: str = "euclidean",
        cluster_selection_epsilon: float = 0.0
    ):
        """
        Args:
            min_cluster_size: Minimum articles to form a cluster
            min_samples: Minimum density for core points
            metric: Distance metric (euclidean for normalized embeddings)
            cluster_selection_epsilon: Threshold for cluster merging
        """
        self.min_cluster_size = min_cluster_size
        self.min_samples = min_samples
        self.metric = metric
        self.cluster_selection_epsilon = cluster_selection_epsilon
    
    def cluster_embeddings(
        self,
        embeddings: np.ndarray,
        article_ids: List[str]
    ) -> Dict[int, List[str]]:
        """
        Group embeddings into clusters.
        
        Args:
            embeddings: Embedding matrix (N x dim)
            article_ids: Corresponding article IDs
            
        Returns:
            Dict mapping cluster_id -> list of article_ids
            cluster_id -1 represents outliers (not grouped)
        """
        if len(embeddings) < self.min_cluster_size:
            logger.info(f"Solo {len(embeddings)} artículos, muy pocos para clustering")
            return {-1: article_ids}
        
        logger.info(f"Clustering {len(embeddings)} articles...")
        
        # HDBSCAN clustering
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=self.min_cluster_size,
            min_samples=self.min_samples,
            metric=self.metric,
            cluster_selection_epsilon=self.cluster_selection_epsilon,
            cluster_selection_method='eom',  # Excess of Mass (mejor para clusters pequeños)
            prediction_data=True
        )
        
        # For normalized embeddings, we convert to distance
        # cosine_distance = 1 - cosine_similarity
        # But since they're normalized, we use euclidean which is equivalent
        cluster_labels = clusterer.fit_predict(embeddings)
        
        # Group articles by cluster
        clusters: Dict[int, List[str]] = {}
        for idx, label in enumerate(cluster_labels):
            label = int(label)
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(article_ids[idx])
        
        # Statistics
        n_clusters = len([k for k in clusters.keys() if k != -1])
        n_outliers = len(clusters.get(-1, []))
        logger.info(f"Found {n_clusters} clusters, {n_outliers} outliers")
        
        return clusters
    
    def cluster_with_probabilities(
        self,
        embeddings: np.ndarray,
        article_ids: List[str]
    ) -> Tuple[Dict[int, List[str]], Dict[str, float]]:
        """
        Clustering con probabilidades de pertenencia.
        
        Returns:
            Tuple de (clusters, probabilities)
            - clusters: Dict cluster_id -> article_ids
            - probabilities: Dict article_id -> probabilidad de pertenencia
        """
        if len(embeddings) < self.min_cluster_size:
            return {-1: article_ids}, {aid: 0.0 for aid in article_ids}
        
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=self.min_cluster_size,
            min_samples=self.min_samples,
            metric=self.metric,
            prediction_data=True
        )
        
        cluster_labels = clusterer.fit_predict(embeddings)
        probabilities = clusterer.probabilities_
        
        clusters: Dict[int, List[str]] = {}
        probs: Dict[str, float] = {}
        
        for idx, (label, prob) in enumerate(zip(cluster_labels, probabilities)):
            label = int(label)
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(article_ids[idx])
            probs[article_ids[idx]] = float(prob)
        
        return clusters, probs
    
    def find_similar_to_centroid(
        self,
        cluster_embeddings: np.ndarray,
        candidate_embedding: np.ndarray,
        threshold: float = 0.75
    ) -> Tuple[bool, float]:
        """
        Verifica si un artículo es similar al centroide de un cluster.
        
        Args:
            cluster_embeddings: Embeddings del cluster existente
            candidate_embedding: Embedding del artículo candidato
            threshold: Umbral de similitud
            
        Returns:
            Tuple (es_similar, similitud_con_centroide)
        """
        # Calcular centroide del cluster
        centroid = np.mean(cluster_embeddings, axis=0)
        centroid = centroid / np.linalg.norm(centroid)  # Normalizar
        
        # Calcular similitud
        similarity = float(np.dot(candidate_embedding, centroid))
        
        return similarity >= threshold, similarity


class DeduplicationService:
    """
    Servicio para detectar y eliminar artículos duplicados o casi duplicados.
    """
    
    def __init__(self, threshold: float = 0.92):
        """
        Args:
            threshold: Umbral de similitud para considerar duplicado (0.92 = 92% similar)
        """
        self.threshold = threshold
    
    def find_duplicates(
        self,
        embeddings: np.ndarray,
        article_ids: List[str]
    ) -> List[Tuple[str, str, float]]:
        """
        Encuentra pares de artículos duplicados.
        
        Returns:
            Lista de tuplas (article_id_1, article_id_2, similarity)
        """
        duplicates = []
        n = len(embeddings)
        
        # Matriz de similitud
        similarity_matrix = np.dot(embeddings, embeddings.T)
        
        # Encontrar pares sobre el umbral
        for i in range(n):
            for j in range(i + 1, n):
                sim = similarity_matrix[i, j]
                if sim >= self.threshold:
                    duplicates.append((article_ids[i], article_ids[j], float(sim)))
        
        return duplicates
    
    def deduplicate(
        self,
        embeddings: np.ndarray,
        article_ids: List[str],
        keep_strategy: str = "first"
    ) -> Tuple[np.ndarray, List[str], List[str]]:
        """
        Elimina duplicados manteniendo uno de cada grupo.
        
        Args:
            embeddings: Matrix de embeddings
            article_ids: IDs de artículos
            keep_strategy: "first" mantiene el primero, "random" aleatorio
            
        Returns:
            Tuple (embeddings_filtrados, ids_filtrados, ids_eliminados)
        """
        duplicates = self.find_duplicates(embeddings, article_ids)
        
        to_remove = set()
        for id1, id2, _ in duplicates:
            # Mantener el primero, eliminar el segundo
            if id1 not in to_remove:
                to_remove.add(id2)
        
        # Filtrar
        keep_mask = [aid not in to_remove for aid in article_ids]
        filtered_embeddings = embeddings[keep_mask]
        filtered_ids = [aid for aid, keep in zip(article_ids, keep_mask) if keep]
        removed_ids = list(to_remove)
        
        if removed_ids:
            logger.info(f"Eliminados {len(removed_ids)} artículos duplicados")
        
        return filtered_embeddings, filtered_ids, removed_ids

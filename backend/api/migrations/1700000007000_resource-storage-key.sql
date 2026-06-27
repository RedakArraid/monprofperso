-- Up Migration
-- Stockage durable des fichiers de ressources : clé d'objet S3/MinIO. Quand un
-- fichier est téléversé sur le stockage objet, sa clé est conservée ici et la
-- colonne `content` (BYTEA) reste nulle. `content` est gardée pour la
-- rétrocompatibilité (ressources créées avant l'activation du stockage objet,
-- ou repli si le stockage est indisponible).

ALTER TABLE resources ADD COLUMN storage_key TEXT;

-- Down Migration
ALTER TABLE resources DROP COLUMN IF EXISTS storage_key;

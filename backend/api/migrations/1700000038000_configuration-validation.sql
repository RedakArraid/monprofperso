-- Une preuve de recette ne reste pas valable après changement de prestataire,
-- de stockage, de documents ou de règles commerciales, même au même SHA.
ALTER TABLE production_checks ADD COLUMN configuration_hash TEXT;

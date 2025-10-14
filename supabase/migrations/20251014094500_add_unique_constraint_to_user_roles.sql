-- Étape 1: Supprimer les doublons en ne gardant que le rôle le plus récent pour chaque utilisateur.
-- Cette requête est spécifique à PostgreSQL et utilise l'identifiant interne `ctid`.
DELETE FROM
    public.user_roles a
        USING public.user_roles b
WHERE
    a.ctid < b.ctid
    AND a.user_id = b.user_id;

-- Étape 2: Ajouter une contrainte UNIQUE pour empêcher la création de futurs doublons.
-- La commande ALTER TABLE ... ADD CONSTRAINT est la manière standard de faire cela.
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

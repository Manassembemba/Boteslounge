import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Étape 1: Initialiser le client d'administration Supabase
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Étape 2: Vérifier que l'utilisateur appelant est un administrateur
    console.log("Vérification du rôle de l'administrateur...");
    const authHeader = req.headers.get("Authorization");
    const { data: { user: callingUser } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!callingUser) throw new Error("Accès non autorisé: Utilisateur non trouvé.");

    const { data: userRole, error: roleError } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", callingUser.id).single();
    if (roleError || userRole?.role !== "admin") {
      throw new Error("Accès refusé: Seuls les administrateurs peuvent créer des utilisateurs.");
    }
    console.log("Rôle administrateur vérifié.");

    // Étape 3: Récupérer et valider les données du corps de la requête
    const { email, password, full_name, username, role, site_id } = await req.json();
    if (role !== 'admin' && !site_id) {
      throw new Error("Requête invalide: site_id est requis pour les non-administrateurs.");
    }
    console.log(`Payload reçu pour l'email: ${email}`);

    // Étape 4: Créer le nouvel utilisateur (avec un minimum d'informations)
    console.log("Création de l'utilisateur dans le schéma auth (minimal)...");
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      // user_metadata est ajouté dans une étape séparée pour le débogage
    });
    if (createError) throw createError;
    if (!newUser.user) throw new Error("La création de l'utilisateur a échoué de manière inattendue.");
    console.log(`Utilisateur ${newUser.user.id} créé avec succès.`);

    // Forcer la confirmation de l'email comme solution de contournement
    console.log(`Forçage de la confirmation de l'email pour l'utilisateur ${newUser.user.id}...`);
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      newUser.user.id,
      { email_confirm: true }
    );
    if (confirmError) throw confirmError;
    console.log("Email confirmé via la mise à jour admin.");

    // Étape 4b: Mettre à jour les métadonnées de l'utilisateur
    console.log(`Mise à jour des métadonnées pour l'utilisateur ${newUser.user.id}...`);
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
      newUser.user.id,
      { user_metadata: { full_name } }
    );
    if (metadataError) throw metadataError;
    console.log("Métadonnées mises à jour avec succès.");

    // Étape 5: Insérer le profil de l'utilisateur (avec le site)
    console.log(`Insertion du profil pour l'utilisateur ${newUser.user.id}...`);
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: newUser.user.id,
      full_name,
      username,
      site_id: role === 'admin' ? null : site_id, // site_id est null pour les admins
      email, // Ajout de l'email manquant
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id); // Nettoyage
      throw profileError;
    }
    console.log("Profil inséré avec succès.");

    // Étape 6: Assigner le rôle à l'utilisateur
    console.log(`Assignation du rôle '${role}' à l'utilisateur ${newUser.user.id}...`);
    const { error: roleInsertError } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: newUser.user.id, role },
      { onConflict: "user_id" }
    );
    if (roleInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id); // Nettoyage
      throw roleInsertError;
    }
    console.log("Rôle assigné avec succès.");

    // Étape 7: Retourner une réponse de succès
    return new Response(JSON.stringify({ message: "Utilisateur créé avec succès" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });

  } catch (error) {
    console.error("Erreur détaillée dans la fonction create-user:", error);

    let errorMessage = error.message;
    if (error instanceof PostgrestError && error.code === '23505') { // Violation de contrainte unique
        errorMessage = "Un utilisateur avec cet email ou un profil associé existe déjà.";
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
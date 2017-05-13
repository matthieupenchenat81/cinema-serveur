# Peuplement de l'ontologie

[![Diagramme Graphe Ontologie](http://i.imgur.com/lTQXUGX.jpg)](http://i.imgur.com/lTQXUGX.jpg)

## Sommaire 
  1. Ajout des **Realisateur**
  2. Ajout des **Film** en renseignant aussi la relation **estRealisePar**
  3. Ajout des **Scene** et des **Lieu** en renseignant la relation **possede** et **seDerouleDans**
  4. Ajout de la **Ville** 'Paris'
  5. Associer tous les **Lieu** existant avec la **Ville** de Paris (relation **estSitueDans**)

## Ajout des **Realisateur**

Un script (écrit en **NodeJS**) se charge de récupérer sous format objet le fichier JSON des films tournés à Paris en 2011. Le script se charge ensuite de récupérer tous les réalisateurs (en supprimant bien tous les doublons).  

Pour chaque réalisateur :

    INSERT {
    	?newUri a cinema:Realisateur;
    	rdfs:label "LABEL_DU_REALISATEUR"@fr.
    }
    WHERE {
    	BIND(uri(concat("URI_ONTOLOGIE", encode_for_uri("LABEL_DU_REALISATEUR"))) AS ?newUri)
    }
    

## Ajout des **Film** en renseignant aussi la relation **estRealisePar** 

À partir de l'objet JSON des films tournés à Paris en 2011, le script récupère la liste de tous les films (en retirant les doublons). Pour chaque film, l'algorithme récupère un tuple (movie, director) et grâce à ce dernier, il peut ensuite générer ce genre de requête pour chaque film :

    INSERT {
        ?film a cinema:Film;
        rdfs:label "TITRE_DU_FILM"@fr;
        :estRealisePar ?realisateur.
    }
    WHERE {
        ?realisateur rdfs:label "LABEL_DU_REALISATEUR"@fr.
        BIND(uri(concat("URI_ONTOLOGIE", encode_for_uri("TITRE_DU_FILM"))) AS ?film)
    }

## Ajout des **Scene** et des **Lieu** en renseignant la relation **possede** et **seDerouleDans**

Avant de charger de nouvelles données, nous allons nous intéresser à récupérer la liste des films pour lesquels aucune coordonnée ne sont renseignés. Après avoir récupéré cette liste, nous allons tenter d'obtenir les coordonnées manquantes depuis l'API [Nominatim](http://wiki.openstreetmap.org/wiki/Nominatim) d'OpenStreetMap.

> Les films pour lesquels l'API n'a pas pu trouver de coordonnées ne seront pas pris en compte dans notre ontologie. 

Toujours à partir de l'objet JSON, l'algorithme récupère ici toutes les informations concernant les scènes et les lieux de tournage. En plus de se charger de l'ajout de chaque **Scene** et **Lieu**, le script renseigne la relation (Film **possede** Scene) ainsi que la relation (Scene **seDerouleDans** Lieu). 

    INSERT {
        <URI_NEW_LIEU> a cinema:Lieu;
        :adresse "ADRESSE_LIEU_TOURNAGE";
        :coordonneesGps "COORDONNEES_GPS".
        
        <URI_NEW_SCENE> a cinema:Scene;
        :dateTournage "DATE_TOURNAGE".
        
        <URI_NEW_SCENE> :seDerouleDans <URI_NEW_LIEU>.
        ?film possede <URI_NEW_SCENE>.
    }
    WHERE {
        ?film rdfs:label "TITRE_FILM"@fr.
    }

## Ajout de la **Ville** 'Paris'    

    INSERT DATA {
    	cinema:Paris a cinema:Ville;
    	rdfs:label "Paris"@fr.
    }
## Associer tous les **Lieu** existant avec la **Ville** de Paris (relation **estSitueDans**)

Étant donné que nous nous intéressons seulement aux films tournés à Paris, nous pourrons donc associer pour tous nos lieux à la ville de Paris. 

    INSERT {
    	?lieu :estSitueDans ?ville.
    }
    WHERE {
        ?ville a cinema:Ville; 
        rdfs:label "Paris"@fr.
        ?lieu a cinema:Lieu.
    }


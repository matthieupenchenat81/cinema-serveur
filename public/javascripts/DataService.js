module.exports = function () {

    var http = require('request-promise'),
        apiFusekiServer = 'http://0.0.0.0:3030/cinema/query',
        prefixPayload = '\
        PREFIX : <http://www.semanticweb.org/sitan.coulibaly/ontologies/2017/2/cinema#>\n\
        PREFIX rdf: <http://www.w3.org/1999/02/22‐rdf‐syntax‐ns#>\n\
        PREFIX owl: <http://www.w3.org/2002/07/owl#>\n\
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf‐schema#>\n';

    return {
        getScenes: getScenes,
        getMovies: getMovies,
        getMonuments: getMonuments
    };


    //------------------------------------------------------------------------------------------

    function getScenes() {

        var payload = prefixPayload + '\
        SELECT ?dateTournage ?address ?geoPoints ?labelFilm ?nomRealisateur ?nomVille\
        WHERE {\
            ?idFilm a :Film; rdfs:label ?labelFilm; :possede ?idScene; :estRealisePar ?idRealisateur.\
            ?idRealisateur rdfs:label ?nomRealisateur.\
            ?idScene :dateTournage ?dateTournage; :seDerouleDans ?idLieu.\
            ?idLieu :adresse ?address; :coordonneesGps ?geoPoints; :estSitueDans ?idVille.\
            ?idVille rdfs:label ?nomVille.\
        }';

        return requestFusekiServer(payload);
    }

    function getMovies() {

        var payload = prefixPayload + '\
        SELECT DISTINCT ?labelFilm ?idFilm\
        WHERE {\
            ?idFilm a :Film; rdfs:label ?labelFilm; :possede ?scene.\
        }';

        return requestFusekiServer(payload);
    }

    function getMonuments() {

        // query SPARQL get monuments
        var payload = prefixPayload + '\
        SELECT ?appellationC ?archi ?periodeConstruction ?coordonneesGps\
        WHERE {\
            ?monument a :Monument;\
            :periodeConstruction ?periodeConstruction;\
            :appellationCourante ?appellationC;\
            :architecte ?archi;\
            :estSitueAu ?lieu.\
            ?lieu :coordonneesGps ?coordonneesGps.\
        }LIMIT 1000';

        return requestFusekiServer(payload);
    }
    // Utils ------------------------------------------------------------------------------------------

    function requestFusekiServer(payload) {

        var options = {
            method: 'POST',
            uri: apiFusekiServer,
            form: {
                query: payload // Will be urlencoded
            },
            headers: {
                Accept: 'application/sparql-results+json,*/*;q=0.9',
            }
        };

        return http(options);
    }
};
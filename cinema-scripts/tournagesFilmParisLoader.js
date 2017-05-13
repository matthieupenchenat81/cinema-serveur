// Include libraries
var fs = require('fs'),
    _ = require('underscore/'),
    requestPromise = require('request-promise'),
    Promise = require("bluebird");

var fileData = fs.readFileSync('tournages-film-paris-2011.json', "utf8"),
    coordinatesFileData = fs.readFileSync('coordinates', "utf8"),
    coordinatesFromOpenstreetmap = JSON.parse(coordinatesFileData),
    arr = JSON.parse(fileData),
    ontologyUri = 'http://www.semanticweb.org/sitan.coulibaly/ontologies/2017/2/cinema#',
    output_ontology = '';

// ------
// Uncomment the followed line if coordinates file is not filled
// retrieveAllMissingCoordinates(arr); 
// ------

var prefix = "PREFIX : <http://www.semanticweb.org/sitan.coulibaly/ontologies/2017/2/cinema#>   \n\
PREFIX rdf: <http://www.w3.org/1999/02/22‐rdf‐syntax‐ns#>                                        \n\
PREFIX owl: <http://www.w3.org/2002/07/owl#>                                                    \n\
PREFIX rdfs: <http://www.w3.org/2000/01/rdf‐schema#>                                            \n\
\n\n";

output_ontology += prefix;
output_ontology += getDirectorsIntoRdfFormat(arr);
output_ontology += getMoviesWithDirectorRelationIntoRdfFormat(arr);
output_ontology += getScenesAndLocations(arr, coordinatesFromOpenstreetmap);
output_ontology += getParisCityIntoRdfFormat();
output_ontology += getParisCityAssociatedToAllLocations();

fs.writeFileSync('rdf-output', output_ontology, 'utf8');

console.log('\n\nFinished process : now you have to replace some strings');
console.log('\t1. Add guillemet around lng and lat values :');
console.log('\t\t"lng":(-{0,1}[0-9.]+) TO "lng":"$1"           ----- IDEM for "lat"');
console.log('\t2. Add escape characters :');
console.log('\t\t"lng":"(-{0,1}[0-9.]+)" TO \"lng\":\"$1\"     ----- IDEM for "lat"');


// -- Functions --

function getDirectorsIntoRdfFormat(tournagesFilmParis) {

    var directors = _.uniq(tournagesFilmParis.map(function (record) {
        return record.fields.realisateur;
    }));
    console.log(directors.length + ' réalisateurs au total');

    return directors.reduce(function (acc, director) {
        var insetRdfQuery = '\t?newUri a :Realisateur;\n\trdfs:label "' + director + '"@fr.',
            whereRdfQuery = '\tBIND(uri(concat("' + ontologyUri + '", encode_for_uri("' + director + '"))) AS ?newUri)',
            rdfQuery = encapsulateWithInsert(insetRdfQuery) + '\n' + encapsulateWithWhere(whereRdfQuery) + ';\n\n';
        return acc + rdfQuery;
    }, '');
}

function getParisCityIntoRdfFormat() {

    return encapsulateWithInsertData('\t<'+ ontologyUri + 'Paris> a :Ville;\n\trdfs:label "Paris"@fr.') + ';\n\n';
}

function getMoviesWithDirectorRelationIntoRdfFormat(tournagesFilmParis) {

    var movies = _.uniq(tournagesFilmParis.map(function (record) {
        return {
            movie: record.fields.titre,
            director: record.fields.realisateur,
            key: record.fields.titre + '_' + record.fields.realisateur
        };
    }), function (item, key, a) {
        return item.key;
    });
    console.log(movies.length + ' films au total');

    var directorMovieMapping = movies.map(function (movie) {
        delete movie.key;
        return movie;
    });

    return directorMovieMapping.reduce(function (acc, item) {
        var insertQuery = '\t?film a :Film;\n\trdfs:label "' + item.movie + '"@fr;\n\t:estRealisePar ?realisateur.',
            whereQuery = '\t?realisateur rdfs:label "' + item.director + '"@fr.\n\tBIND(uri(concat("' + ontologyUri + '", encode_for_uri("' + item.movie + '"))) AS ?film)';
        return acc + encapsulateWithInsert(insertQuery) + '\n' + encapsulateWithWhere(whereQuery) + ';\n\n';
    }, '');
}

function getScenesAndLocations(tournagesFilmParis, coordinatesFromOpenstreetmap) {

    var mappings = tournagesFilmParis.map(function (record) {

        // TODO - check if address file correctly filled

        var coordinates,
        hasAddress = (record && record.fields && record.fields.adresse_complete),
        address = (hasAddress)? record.fields.adresse_complete.replace(/"/g, '\\"'): '';
        if(!record.geometry) {
            // add missing coordinates when it's needed
            coordinates = getCoordinatesFromAddressFromFile(coordinatesFromOpenstreetmap, record.fields.adresse_complete);
        } else {
            coordinates = { lng: record.geometry.coordinates[0], lat: record.geometry.coordinates[1] };
        }

        if(!coordinates || coordinates === 'ADDRESS_NOT__FOUND') coordinates = "{\\\"lng\\\":null,\\\"lat\\\":null}";

        return {
            movie: record.fields.titre,
            idScene: record.recordid + '_' + address + '_SCENE',
            idLocation: record.recordid + '_' + address,
            address: address,
            coordinates: (typeof coordinates !== 'string')? JSON.stringify(coordinates):coordinates,
            shootiongDate: record.fields.date_debut_evenement
        };
    });

    // Keep only scenes with coordinates
    var filteredMappings = mappings.filter(function(record) {
        return (record.coordinates !== "{\\\"lng\\\":null,\\\"lat\\\":null}");
    });

    console.log(filteredMappings.length + ' scènes de tournage au total.');

    return filteredMappings.reduce(function (acc, item) {
        var insertQuery = '\t?idLocation a :Lieu;\n\t:adresse "' + item.address + '";\n\t:coordonneesGps "' + item.coordinates + '".';
        insertQuery += '\n\n\t?idScene a :Scene;\n\t:dateTournage "' + item.shootiongDate + '".';
        insertQuery += '\n\n\t?idScene :seDerouleDans ?idLocation.\n\t?film :possede ?idScene';
        var whereQuery = '\t?film rdfs:label "' + item.movie + '"@fr.\n\t';
        whereQuery += 'BIND(uri(concat("' + ontologyUri + '",  encode_for_uri("' + item.idLocation + '"))) AS ?idLocation)\n\t';
        whereQuery += 'BIND(uri(concat("' + ontologyUri + '",  encode_for_uri("' + item.idScene + '"))) AS ?idScene)';
        return acc + encapsulateWithInsert(insertQuery) + '\n' + encapsulateWithWhere(whereQuery) + ';\n\n';
    }, '');
}

function retrieveAllMissingCoordinates(tournagesFilmParis) {
    var cpt = 0,
    addresses = findMoviesWithoutCoordinates(tournagesFilmParis),
    numberOfMoviesWithoutCoordinates = tournagesFilmParis.length;

    return Promise.all(addresses.map(function (address) {

        return getCoordinatesFromAddress(encodeAddress(address.address)).then(function (coordinates) {
            cpt++;
            console.log('Number of retrieved coordinates : ' + cpt + '/' + numberOfMoviesWithoutCoordinates);
            return {
                address: address.address,
                coordinates: coordinates
            };
        }).catch(function (err) {
            console.log(err);
        });
    })).then(function (moviesWithCoordinates) {
        console.log('Coordinates retrieved with success');
        fs.writeFileSync('coordinates', JSON.stringify(moviesWithCoordinates), 'utf8');
    }).catch(function () {
        console.log('Error when trying to retrieve coordinates');
    });
}

function getParisCityAssociatedToAllLocations() {
    var insertQuery = '\t?lieu :estSitueDans ?ville.',
    whereQuery = '\t?ville a :Ville;\n\trdfs:label "Paris"@fr.\n\t?lieu a :Lieu.';
    return encapsulateWithInsert(insertQuery) + '\n' + encapsulateWithWhere(whereQuery) + ';\n\n';
}

// ------ 

function getCoordinatesFromAddress(address) {

    var options = {
        method: 'GET',
        uri: 'http://nominatim.openstreetmap.org/search?q=' + address + '&format=json',
        json: true
    };

    return requestPromise(options).then(function (res) {

        if (Array.isArray(res) && res.length > 0) {
            return {
                lat: res[0].lat,
                lng: res[0].lon
            };
        } else {
            return 'ADDRESS_NOT__FOUND';
        }
    });
}

function encodeAddress(params) {
    return params.replace(' ', '+');
}

function getCoordinatesFromAddressFromFile(jsonFile, address) {

    var scene = jsonFile.find(function(item) {
        return (item && address === item.address);
    });
    
    if(scene) return scene.coordinates;
    return 'ADDRESS_NOT__FOUND';
}

function findMoviesWithoutCoordinates(tournagesFilmParis) {

    return tournagesFilmParis.reduce(function (acc, record) {
        if (!record.geometry) {
            return acc.concat([{
                address: record.fields.adresse_complete
            }]);
        }
        return acc;
    }, []);
}


// -----

function encapsulateWithInsertData(rdfQuery) {
    return "INSERT DATA {\n" + rdfQuery + "\n}";
}

function encapsulateWithInsert(rdfQuery) {
    return "INSERT {\n" + rdfQuery + "\n}";
}

function encapsulateWithWhere(rdfQuery) {
    return "WHERE {\n" + rdfQuery + "\n}";
}

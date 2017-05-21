// Include libraries
var fs = require('fs'),
    _ = require('underscore/'),
    requestPromise = require('request-promise'),
    Promise = require("bluebird");

var fileData = fs.readFileSync('monuments.json', "utf8"),
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
output_ontology += getMonuments(arr);
/*output_ontology += getMoviesWithDirectorRelationIntoRdfFormat(arr);
output_ontology += getScenesAndLocations(arr, coordinatesFromOpenstreetmap);
output_ontology += getParisCityIntoRdfFormat();
output_ontology += getParisCityAssociatedToAllLocations();*/

fs.writeFileSync('rdf-output', output_ontology, 'utf8');

console.log('\n\nFinished process : now you have to replace some strings');
console.log('\t1. Add guillemet around lng and lat values :');
console.log('\t\t"lng":(-{0,1}[0-9.]+) TO "lng":"$1"           ----- IDEM for "lat"');
console.log('\t2. Add escape characters :');
console.log('\t\t"lng":"(-{0,1}[0-9.]+)" TO \"lng\":\"$1\"     ----- IDEM for "lat"');


// ajouter les Monuments avec les Lieu associés (relation estSitueAu), associant le Lieu à la ville de Paris
function getMonuments(lesMonuments) {

    var monuments = _.uniq(lesMonuments.map(function (record) {

        return {
            newUriLieu: record.fields.ref,
            adresseMonument: record.fields.adrs,
            coordonneesMonument: record.fields.coordonnees_insee, //peut y avoir des vides
            newMonument: (record.fields.tico)? record.fields.tico.replace(/"/g, '\\"'): '' +"_"+ record.fields.ref,
            insee: record.fields.insee,
            date: (record.fields.dpro) ?(record.fields.dpro).substring(10): '', //aaaa/mm/jj prendre les 10 car
            appellation: (record.fields.tico)? record.fields.tico.replace(/"/g, '\\"'): '',
            architecte: record.fields.autr,
            periode: record.fields.scle,
            ville : record.fields.nom_dept
        };

    }));

    // Keep only monuments with coordinates
    var filteredMappings = monuments.filter(function(record) {
        return (record.coordonneesMonument !== "{\\\"lng\\\":null,\\\"lat\\\":null}");
    });
console.log(filteredMappings.length);

    // Keep only monuments from PARIS
    var filteredMappings = monuments.filter(function(record) {
        return (record.ville == "PARIS");
    });
console.log(filteredMappings.length);

    return filteredMappings.reduce(function (acc, monument) {
        var insertQuery = '\t?newUriLieu a :Lieu;\n';
        insertQuery += '\t:adresse "'+monument.adresseMonument +'";\n';
        insertQuery += '\t:coordonneesGps "'+monument.coordonneesMonument +'";\n';
        insertQuery += '\t:estSitueDans ?ville.';

        insertQuery += '\n\t?newMonument a :Monument;\n\t:codeInsee "' + monument.insee;
        insertQuery += '";\n\t:dateProtection "' + monument.date + '";';
        insertQuery += '\n\t:appellationCourante "' + monument.appellation + '";';
        insertQuery += '\n\t:architecte "' + monument.architecte + '";';
        insertQuery += '\n\t:periodeConstruction "' + monument.periode + '";';
        insertQuery += '\n\t:estSitueAu ?newUriLieu.';

        
        whereQuery = '\t?ville rdfs:label "Paris"@fr.\n';
        whereQuery += '\tBIND(uri(concat("' + ontologyUri + '",  encode_for_uri("' + monument.newUriLieu + '"))) AS ?newUriLieu)\n\t';
        whereQuery += 'BIND(uri(concat("' + ontologyUri + '",  encode_for_uri("' + monument.newMonument + '"))) AS ?newMonument)\n\t';

        return acc + encapsulateWithInsert(insertQuery) + '\n' + encapsulateWithWhere(whereQuery) + ';\n\n';;
    }, '');
}


// modèles SPARQL

function encapsulateWithInsertData(rdfQuery) {
    return "INSERT DATA {\n" + rdfQuery + "\n}";
}

function encapsulateWithInsert(rdfQuery) {
    return "INSERT {\n" + rdfQuery + "\n}";
}

function encapsulateWithWhere(rdfQuery) {
    return "WHERE {\n" + rdfQuery + "\n}";
}

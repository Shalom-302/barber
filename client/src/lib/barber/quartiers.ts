// Common neighbourhoods per Abidjan commune, offered in the booking form's
// quartier select. Not exhaustive: the form always offers "Autre quartier"
// with a free-text field. Communes themselves come from the barber's settings
// (/admin/reglages); a commune missing here simply shows the free-text field.
export const QUARTIERS: Record<string, string[]> = {
    Abobo: ["Abobo Gare", "Abobo Baoulé", "Avocatier", "Anonkoua-Kouté", "Belleville", "PK18", "Sagbé", "Samaké", "N'Dotré", "Akeikoi"],
    Adjamé: ["Adjamé Liberté", "Williamsville", "220 Logements", "Bracodi", "Habitat Extension", "Mairie", "Paillet", "Dallas"],
    Anyama: ["Anyama Centre", "Ebimpé", "Akoupé-Zeudji", "Azaguié Gare", "Belleville Anyama"],
    Attécoubé: ["Attécoubé Centre", "Locodjoro", "Santé", "Agban", "Abobo-Doumé", "Boribana", "Mossikro"],
    Bingerville: ["Bingerville Centre", "Akandjé", "Cité Feh Kessé", "Eloka", "Fêh Kessé", "Gbagba", "Santai"],
    Cocody: [
        "Angré", "Riviera 1", "Riviera 2", "Riviera 3", "Riviera 4", "Riviera Palmeraie", "Riviera Golf",
        "Deux Plateaux", "Vallon", "Mermoz", "Saint-Jean", "Danga", "Blockhaus", "Ambassades",
        "Cocody Centre", "Attoban", "Faya", "Bonoumin", "Abatta", "M'Pouto", "Cité des Arts",
    ],
    Koumassi: ["Koumassi Remblais", "Koumassi Campement", "Sicogi", "Prodomo", "Grand Campement", "Divo", "Soweto", "Zone Industrielle"],
    Marcory: ["Zone 4", "Biétry", "Marcory Résidentiel", "Anoumabo", "Champroux", "Remblais", "Sans-Fil", "Hibiscus"],
    Plateau: ["Plateau Centre", "Cité Administrative", "Indénié", "Plateau Dokui"],
    "Port-Bouët": ["Port-Bouët Centre", "Vridi", "Gonzagueville", "Aéroport", "Jean Folly", "Adjouffou", "Derrière Wharf"],
    Songon: ["Songon Agban", "Songon Kassemblé", "Songon Té", "Songon M'Braté", "Dagbé"],
    Treichville: ["Treichville Centre", "Arras", "Biafra", "Zone 3", "Belleville", "Quartier France", "Avenue 21"],
    Yopougon: [
        "Niangon", "Sicogi", "Selmer", "Maroc", "Toits Rouges", "Andokoi", "Wassakara", "Banco",
        "Koweït", "Port-Bouët 2", "Ananeraie", "Yopougon Kouté", "Millionnaire", "Gesco", "Azito", "Attié",
    ],
};

export const OTHER_QUARTIER = "__other__";

export function quartiersFor(commune: string): string[] {
    return QUARTIERS[commune] ?? [];
}

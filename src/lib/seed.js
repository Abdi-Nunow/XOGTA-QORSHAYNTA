import { ref, set } from "firebase/database";
import { db } from "./firebase";

export const seedDatabase = async () => {
    const zones = {
        'regional': { name: 'Somali Regional Revenue' },
        'fafan': { name: 'Faafan' },
        'siti': { name: 'Siti' },
        'shabeele': { name: 'Shabeele' },
        'afdheer': { name: 'Afdheer' },
        'korahay': { name: 'Korahay' },
        'jarar': { name: 'Jarar' },
        'liban': { name: 'Liban' },
        'doollo': { name: 'Doollo' },
        'nogob': { name: 'Nogob' },
        'dawa': { name: 'Dawa' },
        'erer': { name: 'Erer' }
    };

    const districts = {
        // Regional Revenue
        'somaliregional': { name: 'Somali Regional Revenue', zoneId: 'regional', username: 'somaliregional', password: 'regionalpassword' },
        // Faafan
        'shabeley': { name: 'Shabeley', zoneId: 'fafan', username: 'shabeley', password: 'password123' },
        'awbare': { name: 'Awbare', zoneId: 'fafan', username: 'awbare', password: 'password123' },
        'gursum': { name: 'Gursum', zoneId: 'fafan', username: 'gursum', password: 'password123' },
        'qbayax': { name: 'Q/bayax', zoneId: 'fafan', username: 'qbayax', password: 'password123' },
        'xarshiin': { name: 'Xarshiin', zoneId: 'fafan', username: 'xarshiin', password: 'password123' },
        'arorays': { name: 'Arorays', zoneId: 'fafan', username: 'arorays', password: 'password123' },
        'qooraan': { name: 'Qooraan (Mula)', zoneId: 'fafan', username: 'qooraan', password: 'password123' },
        'tuli': { name: 'Tuli-guleed', zoneId: 'fafan', username: 'tuli', password: 'password123' },
        'baabili': { name: 'Baabili', zoneId: 'fafan', username: 'baabili', password: 'password123' },
        'goljano': { name: 'Gol-jano', zoneId: 'fafan', username: 'goljano', password: 'password123' },
        'harawo': { name: 'Harawo (Dharwanaje)', zoneId: 'fafan', username: 'harawo', password: 'password123' },

        // Siti
        'shinile': { name: 'Shinile', zoneId: 'siti', username: 'shinile', password: 'password123' },
        'mae': { name: 'Mae’yso', zoneId: 'siti', username: 'mae', password: 'password123' },
        'dambal': { name: 'Dambal', zoneId: 'siti', username: 'dambal', password: 'password123' },
        'afdam': { name: 'Afdam', zoneId: 'siti', username: 'afdam', password: 'password123' },
        'erer': { name: 'Erer', zoneId: 'siti', username: 'erer', password: 'password123' },
        'ayshaca': { name: 'Ayshaca', zoneId: 'siti', username: 'ayshaca', password: 'password123' },
        'hadhagala': { name: 'Hadhagala', zoneId: 'siti', username: 'hadhagala', password: 'password123' },
        'gablalu': { name: 'Gablalu', zoneId: 'siti', username: 'gablalu', password: 'password123' },
        'gotabiki': { name: 'Gota-Biki', zoneId: 'siti', username: 'gotabiki', password: 'password123' },

        // Shabeele
        'godey': { name: 'Godey', zoneId: 'shabeele', username: 'godey', password: 'password123' },
        'kalafo': { name: 'Kalafo', zoneId: 'shabeele', username: 'kalafo', password: 'password123' },
        'mustahil': { name: 'Mustahil', zoneId: 'shabeele', username: 'mustahil', password: 'password123' },
        'fer-fer': { name: 'Fer-fer', zoneId: 'shabeele', username: 'ferfer', password: 'password123' },
        'danan': { name: 'Danan', zoneId: 'shabeele', username: 'danan', password: 'password123' },
        'adadley': { name: 'Adadley', zoneId: 'shabeele', username: 'adadley', password: 'password123' },
        'eastimay': { name: 'East imay', zoneId: 'shabeele', username: 'eastimay', password: 'password123' },
        'bercano': { name: 'Ber-cano', zoneId: 'shabeele', username: 'bercano', password: 'password123' },
        'eleele': { name: 'Eleele', zoneId: 'shabeele', username: 'eleele', password: 'password123' },
        'abaqorow': { name: 'Abaqorow', zoneId: 'shabeele', username: 'abaqorow', password: 'password123' },

        // Afdheer
        'haegelle': { name: 'Haegelle', zoneId: 'afdheer', username: 'haegelle', password: 'password123' },
        'elkari': { name: 'Elkari', zoneId: 'afdheer', username: 'elkari', password: 'password123' },
        'barey': { name: 'Barey', zoneId: 'afdheer', username: 'barey', password: 'password123' },
        'dolobay': { name: 'Dolo-bay', zoneId: 'afdheer', username: 'dolobay', password: 'password123' },
        'westimey': { name: 'West imey', zoneId: 'afdheer', username: 'westimey', password: 'password123' },
        'charati': { name: 'Charati', zoneId: 'afdheer', username: 'charati', password: 'password123' },
        'raso': { name: 'Raso', zoneId: 'afdheer', username: 'raso', password: 'password123' },
        'qooxle': { name: 'Qooxle', zoneId: 'afdheer', username: 'qooxle', password: 'password123' },
        'godgod': { name: 'God-god', zoneId: 'afdheer', username: 'godgod', password: 'password123' },

        // Korahay
        'kabridahar': { name: 'Kabridahar', zoneId: 'korahay', username: 'kabridahar', password: 'password123' },
        'shilaabo': { name: 'Shilaabo', zoneId: 'korahay', username: 'shilaabo', password: 'password123' },
        'doboweyn': { name: 'Doboweyn', zoneId: 'korahay', username: 'doboweyn', password: 'password123' },
        'sheykosh': { name: 'Sheykosh', zoneId: 'korahay', username: 'sheykosh', password: 'password123' },
        'marsin': { name: 'Marsin', zoneId: 'korahay', username: 'marsin', password: 'password123' },
        'ceelogadeen': { name: 'Ceel-ogadeen', zoneId: 'korahay', username: 'ceelogadeen', password: 'password123' },
        'lasdhankayre': { name: 'Lasdhankayre', zoneId: 'korahay', username: 'lasdhankayre', password: 'password123' },
        'boodaley': { name: 'Boodaley', zoneId: 'korahay', username: 'boodaley', password: 'password123' },
        'goglokudunbuur': { name: 'Goglo-Kudunbuur', zoneId: 'korahay', username: 'goglokudunbuur', password: 'password123' },
        'higlooley': { name: 'Higlooley', zoneId: 'korahay', username: 'higlooley', password: 'password123' },

        // Jarar
        'degahbour': { name: 'Degah-bour', zoneId: 'jarar', username: 'degahbour', password: 'password123' },
        'dagahmadow': { name: 'Dagahmadow', zoneId: 'jarar', username: 'dagahmadow', password: 'password123' },
        'gashamo': { name: 'Gashamo', zoneId: 'jarar', username: 'gashamo', password: 'password123' },
        'aware': { name: 'Aware', zoneId: 'jarar', username: 'aware', password: 'password123' },
        'gunagado': { name: 'Gunagado', zoneId: 'jarar', username: 'gunagado', password: 'password123' },
        'ararso': { name: 'Ararso', zoneId: 'jarar', username: 'ararso', password: 'password123' },
        'birkot': { name: 'Birkot', zoneId: 'jarar', username: 'birkot', password: 'password123' },
        'yoaale': { name: 'Yoa’ale', zoneId: 'jarar', username: 'yoaale', password: 'password123' },
        'daror': { name: 'Daror', zoneId: 'jarar', username: 'daror', password: 'password123' },
        'dig': { name: 'Dig', zoneId: 'jarar', username: 'dig', password: 'password123' },
        'bilcilbuur': { name: 'Bilcilbuur', zoneId: 'jarar', username: 'bilcilbuur', password: 'password123' },

        // Liban
        'filtu': { name: 'Filtu', zoneId: 'liban', username: 'filtu', password: 'password123' },
        'guradamole': { name: 'Guradamole', zoneId: 'liban', username: 'guradamole', password: 'password123' },
        'dolloado': { name: 'Dollo-ado', zoneId: 'liban', username: 'dolloado', password: 'password123' },
        'gorobakaksa': { name: 'Gorobakaksa', zoneId: 'liban', username: 'gorobakaksa', password: 'password123' },
        'dakasuftu': { name: 'Dakasuftu', zoneId: 'liban', username: 'dakasuftu', password: 'password123' },
        'karsadula': { name: 'Karsadula', zoneId: 'liban', username: 'karsadula', password: 'password123' },
        'boqolmaayo': { name: 'Boqol-maayo', zoneId: 'liban', username: 'boqolmaayo', password: 'password123' },

        // Doollo
        'warder': { name: 'Warder', zoneId: 'doollo', username: 'warder', password: 'password123' },
        'galadi': { name: 'Galadi', zoneId: 'doollo', username: 'galadi', password: 'password123' },
        'bokh': { name: 'Bokh', zoneId: 'doollo', username: 'bokh', password: 'password123' },
        'danot': { name: 'Danot', zoneId: 'doollo', username: 'danot', password: 'password123' },
        'daratole': { name: 'Dara’tole', zoneId: 'doollo', username: 'daratole', password: 'password123' },
        'lahelyucub': { name: 'Lahel-Yucub', zoneId: 'doollo', username: 'lahelyucub', password: 'password123' },
        'galxamur': { name: 'Galxamur', zoneId: 'doollo', username: 'galxamur', password: 'password123' },

        // Nogob
        'celwayne': { name: 'Cel-wayne', zoneId: 'nogob', username: 'celwayne', password: 'password123' },
        'garbo': { name: 'Garbo', zoneId: 'nogob', username: 'garbo', password: 'password123' },
        'segag': { name: 'Segag', zoneId: 'nogob', username: 'segag', password: 'password123' },
        'duhun': { name: 'Duhun', zoneId: 'nogob', username: 'duhun', password: 'password123' },
        'cayuun': { name: 'Cayuun', zoneId: 'nogob', username: 'cayuun', password: 'password123' },
        'ilohoroshagax': { name: 'Ilo-Horoshagax', zoneId: 'nogob', username: 'ilohoroshagax', password: 'password123' },
        'xaraaray': { name: 'Xaraaray', zoneId: 'nogob', username: 'xaraaray', password: 'password123' },

        // Dawa
        'moyale': { name: 'Moyale', zoneId: 'dawa', username: 'moyale', password: 'password123' },
        'hudet': { name: 'Hudet', zoneId: 'dawa', username: 'hudet', password: 'password123' },
        'mubarak': { name: 'Mubarak', zoneId: 'dawa', username: 'mubarak', password: 'password123' },
        'qadhadhumi': { name: 'Qadhadhumi', zoneId: 'dawa', username: 'qadhadhumi', password: 'password123' },

        // Erer
        'fik': { name: 'Fik', zoneId: 'erer', username: 'fik', password: 'password123' },
        'mayamuliqo': { name: 'Mayamuliqo', zoneId: 'erer', username: 'mayamuliqo', password: 'password123' },
        'hamaro': { name: 'Hamaro', zoneId: 'erer', username: 'hamaro', password: 'password123' },
        'lagahida': { name: 'Lagahida', zoneId: 'erer', username: 'lagahida', password: 'password123' },
        'salahad': { name: 'Salahad', zoneId: 'erer', username: 'salahad', password: 'password123' },
        'qubi': { name: 'Qubi', zoneId: 'erer', username: 'qubi', password: 'password123' },
        'waangay': { name: 'Waangay', zoneId: 'erer', username: 'waangay', password: 'password123' },
        'yaxoob': { name: 'Yaxoob', zoneId: 'erer', username: 'yaxoob', password: 'password123' }
    };

    const users = {
        'admin': { username: 'admin', password: 'adminpassword', role: 'admin' }
    };

    try {
        await set(ref(db, 'zones'), zones);
        await set(ref(db, 'districts'), districts);
        await set(ref(db, 'users'), users);
        console.log('Database Initialized successfully!');
        return { success: true };
    } catch (err) {
        console.error('Seed failed:', err);
        return { success: false, error: err.message };
    }
};
